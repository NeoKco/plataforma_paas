import argparse
import sys
from pathlib import Path

from sqlalchemy.orm import Session

BACKEND_DIR = Path(__file__).resolve().parents[2]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.apps.tenant_modules.business_core.models import (  # noqa: E402
    BusinessClient,
    BusinessOrganization,
)
from app.apps.tenant_modules.core.services.tenant_connection_service import (  # noqa: E402
    TenantConnectionService,
)
from app.apps.tenant_modules.finance.models.transaction import FinanceTransaction  # noqa: E402
from app.apps.tenant_modules.finance.schemas import FinanceTransactionCreateRequest  # noqa: E402
from app.apps.tenant_modules.finance.services.transaction_service import FinanceService  # noqa: E402
from app.apps.tenant_modules.maintenance.models.cost_actual import (  # noqa: E402
    MaintenanceCostActual,
)
from app.apps.tenant_modules.maintenance.models.work_order import (  # noqa: E402
    MaintenanceWorkOrder,
)
from app.apps.tenant_modules.maintenance.services.costing_service import (  # noqa: E402
    MaintenanceCostingService,
)
from app.common.db.control_database import ControlSessionLocal  # noqa: E402


tenant_connection_service = TenantConnectionService()
finance_service = FinanceService()
costing_service = MaintenanceCostingService(finance_service=finance_service)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Create missing expense transactions for maintenance work orders "
            "when income exists and actual costs > 0."
        )
    )
    parser.add_argument("--tenant-slug", required=True, help="Active tenant slug")
    parser.add_argument("--apply", action="store_true", help="Apply changes")
    parser.add_argument("--limit", type=int, default=0, help="Limit number of rows to scan")
    return parser.parse_args()


def _build_label(db: Session, work_order: MaintenanceWorkOrder) -> str | None:
    client_label = None
    if work_order.client_id:
        client = (
            db.query(BusinessClient)
            .filter(BusinessClient.id == work_order.client_id)
            .first()
        )
        if client is not None and client.organization_id:
            organization = (
                db.query(BusinessOrganization)
                .filter(BusinessOrganization.id == client.organization_id)
                .first()
            )
            if organization is not None and organization.name:
                client_label = organization.name
    if not client_label:
        return None
    return " · ".join([f"#{work_order.id}", work_order.title, client_label])


def _find_existing_expense(db: Session, work_order_id: int) -> FinanceTransaction | None:
    return (
        db.query(FinanceTransaction)
        .filter(
            FinanceTransaction.source_type == "maintenance_work_order_expense",
            FinanceTransaction.source_id == work_order_id,
        )
        .first()
    )


def _has_income(db: Session, actual: MaintenanceCostActual) -> bool:
    if actual.actual_price_charged > 0 or actual.income_transaction_id:
        return True
    existing_income = (
        db.query(FinanceTransaction)
        .filter(
            FinanceTransaction.source_type == "maintenance_work_order_income",
            FinanceTransaction.source_id == actual.work_order_id,
        )
        .first()
    )
    return existing_income is not None


def backfill_expenses(db: Session, apply: bool, limit: int) -> None:
    defaults = costing_service.get_finance_sync_defaults(db)
    currency_id = defaults.get("maintenance_finance_currency_id")
    expense_category_id = defaults.get("maintenance_finance_expense_category_id")
    expense_account_id = defaults.get("maintenance_finance_expense_account_id")

    if currency_id is None:
        raise ValueError("No se encontró moneda por defecto para sync de finanzas.")

    query = db.query(MaintenanceCostActual).filter(MaintenanceCostActual.total_actual_cost > 0)
    if limit > 0:
        query = query.limit(limit)
    rows = query.all()

    created = 0
    linked_existing = 0
    skipped_missing_income = 0
    skipped_missing_label = 0
    skipped_zero_cost = 0
    skipped_existing_expense = 0
    skipped_missing_work_order = 0

    for actual in rows:
        if actual.total_actual_cost <= 0:
            skipped_zero_cost += 1
            continue
        if not _has_income(db, actual):
            skipped_missing_income += 1
            continue
        work_order = (
            db.query(MaintenanceWorkOrder)
            .filter(MaintenanceWorkOrder.id == actual.work_order_id)
            .first()
        )
        if work_order is None:
            skipped_missing_work_order += 1
            continue
        if actual.expense_transaction_id:
            skipped_existing_expense += 1
            continue
        existing_tx = _find_existing_expense(db, work_order.id)
        if existing_tx is not None:
            actual.expense_transaction_id = existing_tx.id
            linked_existing += 1
            continue

        label = _build_label(db, work_order)
        if not label:
            skipped_missing_label += 1
            continue

        description = f"Egreso mantención {label}"
        transaction_at = work_order.completed_at or work_order.updated_at
        payload = FinanceTransactionCreateRequest(
            transaction_type="expense",
            account_id=expense_account_id,
            target_account_id=None,
            category_id=expense_category_id,
            beneficiary_id=None,
            person_id=None,
            project_id=None,
            currency_id=currency_id,
            loan_id=None,
            amount=actual.total_actual_cost,
            discount_amount=0,
            exchange_rate=None,
            amortization_months=None,
            transaction_at=transaction_at,
            alternative_date=None,
            description=description,
            notes=actual.notes,
            is_favorite=False,
            is_reconciled=False,
            tag_ids=[],
        )
        transaction = finance_service.create_transaction(
            db,
            payload,
            created_by_user_id=actual.updated_by_user_id,
            source_type="maintenance_work_order_expense",
            source_id=work_order.id,
            summary="Egreso sincronizado desde maintenance (backfill)",
            audit_payload={"work_order_id": work_order.id},
            allow_accountless=expense_account_id is None,
        )
        actual.expense_transaction_id = transaction.id
        created += 1

    print(f"cost_actual scanned: {len(rows)}")
    print(f"created_expense: {created}")
    print(f"linked_existing_expense: {linked_existing}")
    print(f"skipped_existing_expense: {skipped_existing_expense}")
    print(f"skipped_missing_income: {skipped_missing_income}")
    print(f"skipped_missing_label: {skipped_missing_label}")
    print(f"skipped_missing_work_order: {skipped_missing_work_order}")
    print(f"skipped_zero_cost: {skipped_zero_cost}")

    if apply:
        db.commit()
        print("Changes applied.")
    else:
        db.rollback()
        print("Dry-run completed. Use --apply to persist.")


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
            backfill_expenses(tenant_db, args.apply, args.limit)
        finally:
            tenant_db.close()
    finally:
        control_db.close()


if __name__ == "__main__":
    main()
