from __future__ import annotations

import argparse

from app.apps.platform_control.repositories.tenant_repository import TenantRepository
from app.apps.tenant_modules.core.services.tenant_data_service import TenantDataService
from app.apps.tenant_modules.maintenance.models.cost_actual import MaintenanceCostActual
from app.apps.tenant_modules.maintenance.models.work_order import MaintenanceWorkOrder
from app.apps.tenant_modules.maintenance.services.costing_service import MaintenanceCostingService
from app.common.config.settings import settings
from app.common.db.control_database import ControlSessionLocal
from app.common.db.tenant_database import get_tenant_session_factory
from app.common.security.tenant_secret_service import TenantSecretService


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description=(
            "Normaliza la politica maintenance-finance de un tenant y reintenta "
            "la sincronizacion de mantenciones completadas sin movimientos financieros."
        )
    )
    parser.add_argument("--tenant-slug", required=True, help="Slug del tenant a reparar")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Solo informa que corregiria sin escribir cambios",
    )
    return parser


def main() -> int:
    args = build_parser().parse_args()
    control_db = ControlSessionLocal()
    tenant = TenantRepository().get_by_slug(control_db, args.tenant_slug)
    if tenant is None:
        print(f"Tenant no encontrado: {args.tenant_slug}")
        return 1

    password = TenantSecretService().resolve_tenant_db_password(tenant.slug, settings)
    SessionLocal = get_tenant_session_factory(
        host=tenant.db_host,
        port=tenant.db_port,
        database=tenant.db_name,
        username=tenant.db_user,
        password=password,
    )
    tenant_db = SessionLocal()
    tenant_data_service = TenantDataService()
    costing_service = MaintenanceCostingService()

    policy_before = tenant_data_service.get_maintenance_finance_sync_policy(tenant_db)
    print(f"Tenant: {tenant.slug}")
    print(f"Politica actual: {policy_before}")

    if (
        getattr(tenant_data_service.get_tenant_info(tenant_db), "maintenance_finance_sync_mode", None)
        == "auto_on_close"
        and not getattr(tenant_data_service.get_tenant_info(tenant_db), "maintenance_finance_auto_sync_income", True)
        and not getattr(tenant_data_service.get_tenant_info(tenant_db), "maintenance_finance_auto_sync_expense", True)
    ):
        if args.dry_run:
            print("DRY RUN: activaria auto_sync_income y auto_sync_expense para evitar modo auto contradictorio.")
        else:
            tenant_data_service.update_maintenance_finance_sync_policy(
                tenant_db,
                sync_mode="auto_on_close",
                auto_sync_income=True,
                auto_sync_expense=True,
                income_account_id=policy_before["maintenance_finance_income_account_id"],
                expense_account_id=policy_before["maintenance_finance_expense_account_id"],
                income_category_id=policy_before["maintenance_finance_income_category_id"],
                expense_category_id=policy_before["maintenance_finance_expense_category_id"],
                currency_id=policy_before["maintenance_finance_currency_id"],
            )
            print("Politica normalizada: auto_sync_income=true, auto_sync_expense=true")

    candidates = (
        tenant_db.query(MaintenanceWorkOrder.id)
        .join(MaintenanceCostActual, MaintenanceCostActual.work_order_id == MaintenanceWorkOrder.id)
        .filter(MaintenanceWorkOrder.maintenance_status == "completed")
        .filter(
            (
                (MaintenanceCostActual.actual_price_charged > 0)
                & (MaintenanceCostActual.income_transaction_id.is_(None))
            )
            | (
                (MaintenanceCostActual.total_actual_cost > 0)
                & (MaintenanceCostActual.expense_transaction_id.is_(None))
            )
        )
        .order_by(MaintenanceWorkOrder.completed_at.asc(), MaintenanceWorkOrder.id.asc())
        .all()
    )
    candidate_ids = [item[0] for item in candidates]
    print(f"OT pendientes de sync: {candidate_ids}")

    synced_ids: list[int] = []
    for work_order_id in candidate_ids:
        if args.dry_run:
            print(f"DRY RUN: reintentaria sync OT #{work_order_id}")
            continue
        detail = costing_service.maybe_auto_sync_by_tenant_policy(tenant_db, work_order_id)
        if detail is not None:
            synced_ids.append(work_order_id)

    if not args.dry_run:
        print(f"OT sincronizadas: {synced_ids}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
