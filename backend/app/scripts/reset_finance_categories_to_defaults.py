import argparse
import sys
from pathlib import Path

from sqlalchemy import func


BACKEND_DIR = Path(__file__).resolve().parents[2]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.apps.tenant_modules.core.services.tenant_connection_service import (  # noqa: E402
    TenantConnectionService,
)
from app.apps.tenant_modules.finance.default_category_profiles import (  # noqa: E402
    get_default_finance_category_seeds,
)
from app.apps.tenant_modules.finance.models.budget import FinanceBudget  # noqa: E402
from app.apps.tenant_modules.finance.models.category import FinanceCategory  # noqa: E402
from app.apps.tenant_modules.finance.models.transaction import FinanceTransaction  # noqa: E402
from app.apps.provisioning.services.tenant_db_bootstrap_service import (  # noqa: E402
    TenantDatabaseBootstrapService,
)
from app.common.db.control_database import ControlSessionLocal  # noqa: E402


tenant_connection_service = TenantConnectionService()
tenant_bootstrap_service = TenantDatabaseBootstrapService()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Reset finance categories to default catalog, remapping references."
    )
    parser.add_argument("--tenant-slug", required=True, help="Active tenant slug")
    parser.add_argument("--apply", action="store_true", help="Apply changes")
    return parser.parse_args()


def _normalize_key(name: str, category_type: str) -> tuple[str, str]:
    return (name.strip().lower(), category_type.strip().lower())


def _build_default_keys(tenant_type: str) -> set[tuple[str, str]]:
    keys: set[tuple[str, str]] = set()
    for seed in get_default_finance_category_seeds(tenant_type):
        keys.add(_normalize_key(seed["name"], seed["category_type"]))
    return keys


def _get_default_id(db, name: str, category_type: str) -> int:
    item = (
        db.query(FinanceCategory)
        .filter(func.lower(FinanceCategory.name) == name.lower())
        .filter(FinanceCategory.category_type == category_type)
        .first()
    )
    if item is None:
        raise RuntimeError(f"Default category not found: {name} ({category_type})")
    return item.id


def reset_categories(db, tenant_type: str) -> dict[str, int]:
    tenant_bootstrap_service._seed_finance_categories(db, tenant_type=tenant_type)
    db.flush()

    default_keys = _build_default_keys(tenant_type)
    fallback_income_id = _get_default_id(db, "Ingreso General", "income")
    fallback_expense_id = _get_default_id(db, "Egreso General", "expense")
    fallback_transfer_id = _get_default_id(db, "Transferencia interna", "transfer")

    removed = 0
    remapped_transactions = 0
    remapped_budgets = 0

    categories = db.query(FinanceCategory).all()
    for category in categories:
        key = _normalize_key(category.name, category.category_type)
        if key in default_keys:
            continue

        if category.category_type == "income":
            replacement_id = fallback_income_id
        elif category.category_type == "transfer":
            replacement_id = fallback_transfer_id
        else:
            replacement_id = fallback_expense_id

        tx_count = (
            db.query(FinanceTransaction)
            .filter(FinanceTransaction.category_id == category.id)
            .update({FinanceTransaction.category_id: replacement_id})
        )
        if tx_count:
            remapped_transactions += tx_count

        budget_count = (
            db.query(FinanceBudget)
            .filter(FinanceBudget.category_id == category.id)
            .update({FinanceBudget.category_id: replacement_id})
        )
        if budget_count:
            remapped_budgets += budget_count

        db.query(FinanceCategory).filter(FinanceCategory.id == category.id).delete()
        removed += 1

    return {
        "removed_categories": removed,
        "remapped_transactions": remapped_transactions,
        "remapped_budgets": remapped_budgets,
    }


def main() -> None:
    args = parse_args()
    control_db = ControlSessionLocal()
    try:
        tenant = tenant_connection_service.get_tenant(control_db, args.tenant_slug)
        if tenant is None:
            raise ValueError(f"Active tenant '{args.tenant_slug}' was not found")
        session_factory = tenant_connection_service.get_tenant_session(tenant)
        tenant_db = session_factory()
        try:
            result = reset_categories(tenant_db, tenant_type=tenant.tenant_type)
            if args.apply:
                tenant_db.commit()
                print(f"{tenant.slug}: {result}")
            else:
                tenant_db.rollback()
                print(f"{tenant.slug}: dry-run {result}")
        finally:
            tenant_db.close()
    finally:
        control_db.close()


if __name__ == "__main__":
    main()
