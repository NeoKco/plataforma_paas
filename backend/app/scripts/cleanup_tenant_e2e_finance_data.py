import argparse
import sys
from pathlib import Path

from sqlalchemy import and_, false, or_
from sqlalchemy.orm import Session


BACKEND_DIR = Path(__file__).resolve().parents[2]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.apps.tenant_modules.core.services.tenant_connection_service import (  # noqa: E402
    TenantConnectionService,
)
from app.apps.tenant_modules.finance.models.account import FinanceAccount  # noqa: E402
from app.apps.tenant_modules.finance.models.budget import FinanceBudget  # noqa: E402
from app.apps.tenant_modules.finance.models.category import FinanceCategory  # noqa: E402
from app.apps.tenant_modules.finance.models.currency import FinanceCurrency  # noqa: E402
from app.apps.tenant_modules.finance.models.loan import FinanceLoan  # noqa: E402
from app.apps.tenant_modules.finance.models.loan_installment import (  # noqa: E402
    FinanceLoanInstallment,
)
from app.apps.tenant_modules.finance.models.settings import FinanceSetting  # noqa: E402
from app.apps.tenant_modules.finance.models.transaction import FinanceTransaction  # noqa: E402
from app.apps.tenant_modules.finance.models.transaction_attachment import (  # noqa: E402
    FinanceTransactionAttachment,
)
from app.common.db.control_database import ControlSessionLocal  # noqa: E402


tenant_connection_service = TenantConnectionService()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Cleanup E2E finance data (categories, accounts, budgets, loans, transactions)."
    )
    parser.add_argument("--tenant-slug", required=True, help="Active tenant slug")
    parser.add_argument(
        "--prefixes",
        default="e2e-,debug-",
        help="Comma-separated prefixes to cleanup (default: e2e-,debug-)",
    )
    parser.add_argument("--apply", action="store_true", help="Apply changes")
    return parser.parse_args()


def _prefix_filters(column, prefixes: list[str]):
    return or_(*[column.ilike(f"{prefix}%") for prefix in prefixes])


def _collect_ids(db: Session, model, column, prefixes: list[str]) -> list[int]:
    if not prefixes:
        return []
    rows = db.query(model.id).filter(_prefix_filters(column, prefixes)).all()
    return [row.id for row in rows]


def _delete_query(db: Session, query, label: str, apply: bool) -> int:
    count = query.count()
    if apply and count:
        query.delete(synchronize_session=False)
    print(f"{label}: {count}")
    return count


def cleanup_finance(db: Session, prefixes: list[str], apply: bool) -> None:
    if not prefixes:
        print("No prefixes supplied, nothing to cleanup.")
        return
    category_ids = _collect_ids(db, FinanceCategory, FinanceCategory.name, prefixes)
    account_ids = _collect_ids(db, FinanceAccount, FinanceAccount.name, prefixes)
    loan_ids = _collect_ids(db, FinanceLoan, FinanceLoan.name, prefixes)
    currency_ids = _collect_ids(db, FinanceCurrency, FinanceCurrency.name, prefixes)

    transaction_query = db.query(FinanceTransaction).filter(
        or_(
            _prefix_filters(FinanceTransaction.description, prefixes),
            and_(
                FinanceTransaction.notes.isnot(None),
                _prefix_filters(FinanceTransaction.notes, prefixes),
            ),
            FinanceTransaction.category_id.in_(category_ids) if category_ids else false(),
            FinanceTransaction.account_id.in_(account_ids) if account_ids else false(),
            FinanceTransaction.target_account_id.in_(account_ids) if account_ids else false(),
            FinanceTransaction.loan_id.in_(loan_ids) if loan_ids else false(),
        )
    )
    transaction_ids = [row.id for row in transaction_query.with_entities(FinanceTransaction.id).all()]

    if transaction_ids:
        _delete_query(
            db,
            db.query(FinanceTransactionAttachment).filter(
                FinanceTransactionAttachment.transaction_id.in_(transaction_ids)
            ),
            "attachments",
            apply,
        )

    _delete_query(
        db,
        db.query(FinanceTransaction).filter(FinanceTransaction.id.in_(transaction_ids)),
        "transactions",
        apply,
    )

    _delete_query(
        db,
        db.query(FinanceBudget).filter(FinanceBudget.category_id.in_(category_ids)),
        "budgets",
        apply,
    )

    _delete_query(
        db,
        db.query(FinanceLoanInstallment).filter(FinanceLoanInstallment.loan_id.in_(loan_ids)),
        "loan_installments",
        apply,
    )

    _delete_query(
        db,
        db.query(FinanceLoan).filter(FinanceLoan.id.in_(loan_ids)),
        "loans",
        apply,
    )

    _delete_query(
        db,
        db.query(FinanceAccount).filter(FinanceAccount.id.in_(account_ids)),
        "accounts",
        apply,
    )

    _delete_query(
        db,
        db.query(FinanceCategory).filter(FinanceCategory.id.in_(category_ids)),
        "categories",
        apply,
    )

    _delete_query(
        db,
        db.query(FinanceCurrency)
        .filter(FinanceCurrency.id.in_(currency_ids))
        .filter(FinanceCurrency.is_base.is_(False)),
        "currencies",
        apply,
    )

    _delete_query(
        db,
        db.query(FinanceSetting).filter(_prefix_filters(FinanceSetting.setting_key, prefixes)),
        "settings",
        apply,
    )


def main() -> None:
    args = parse_args()
    prefixes = [item.strip() for item in args.prefixes.split(",") if item.strip()]

    control_db = ControlSessionLocal()
    try:
        tenant = tenant_connection_service.get_tenant(control_db, args.tenant_slug)
        if tenant is None:
            raise ValueError(f"Active tenant '{args.tenant_slug}' was not found")

        session_factory = tenant_connection_service.get_tenant_session(tenant)
        tenant_db = session_factory()
        try:
            cleanup_finance(tenant_db, prefixes, args.apply)
            if args.apply:
                tenant_db.commit()
                print("Cleanup applied.")
            else:
                tenant_db.rollback()
                print("Dry-run completed. Use --apply to persist.")
        finally:
            tenant_db.close()
    finally:
        control_db.close()


if __name__ == "__main__":
    main()
