from __future__ import annotations

import argparse
import sys
from pathlib import Path

from sqlalchemy import or_


BACKEND_DIR = Path(__file__).resolve().parents[2]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.apps.platform_control.repositories.tenant_repository import TenantRepository
from app.apps.tenant_modules.core.services.tenant_connection_service import (
    TenantConnectionService,
)
from app.apps.tenant_modules.core.services.tenant_data_service import TenantDataService
from app.apps.tenant_modules.maintenance.models.cost_actual import MaintenanceCostActual
from app.apps.tenant_modules.maintenance.models.work_order import MaintenanceWorkOrder
from app.apps.tenant_modules.maintenance.services.costing_service import MaintenanceCostingService
from app.common.db.control_database import ControlSessionLocal


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description=(
            "Normaliza la politica maintenance-finance y reintenta la "
            "sincronizacion de mantenciones completadas sin movimientos financieros."
        )
    )
    target_group = parser.add_mutually_exclusive_group(required=True)
    target_group.add_argument("--tenant-slug", help="Slug del tenant a reparar")
    target_group.add_argument(
        "--all-active",
        action="store_true",
        help="Procesa todos los tenants activos con DB configurada",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=100,
        help="Máximo de tenants cuando se usa --all-active",
    )
    parser.add_argument(
        "--include-archived",
        action="store_true",
        help="Incluye tenants archivados en el barrido masivo",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Solo informa que corregiria sin escribir cambios",
    )
    return parser


def _open_tenant_session(tenant):
    session_factory = TenantConnectionService().get_tenant_session(tenant)
    return session_factory()


def _find_candidate_ids(tenant_db) -> list[int]:
    candidates = (
        tenant_db.query(MaintenanceWorkOrder.id)
        .join(MaintenanceCostActual, MaintenanceCostActual.work_order_id == MaintenanceWorkOrder.id)
        .filter(MaintenanceWorkOrder.maintenance_status == "completed")
        .filter(
            or_(
                (
                    (MaintenanceCostActual.actual_price_charged > 0)
                    & (MaintenanceCostActual.income_transaction_id.is_(None))
                ),
                (
                    (MaintenanceCostActual.total_actual_cost > 0)
                    & (MaintenanceCostActual.expense_transaction_id.is_(None))
                ),
            )
        )
        .order_by(MaintenanceWorkOrder.completed_at.asc(), MaintenanceWorkOrder.id.asc())
        .all()
    )
    return [item[0] for item in candidates]


def _repair_single_tenant(tenant, *, dry_run: bool) -> dict:
    tenant_db = _open_tenant_session(tenant)
    tenant_data_service = TenantDataService()
    costing_service = MaintenanceCostingService()
    try:
        tenant_info = tenant_data_service.get_tenant_info(tenant_db)
        if tenant_info is None:
            return {
                "tenant_slug": tenant.slug,
                "policy_before": None,
                "normalized_policy": False,
                "candidate_ids": [],
                "synced_ids": [],
                "error": "tenant_info_missing",
            }

        policy_before = tenant_data_service.get_maintenance_finance_sync_policy(tenant_db)
        normalized_policy = False
        raw_mode = getattr(tenant_info, "maintenance_finance_sync_mode", None)
        raw_auto_income = getattr(tenant_info, "maintenance_finance_auto_sync_income", True)
        raw_auto_expense = getattr(tenant_info, "maintenance_finance_auto_sync_expense", True)

        if raw_mode == "auto_on_close" and not raw_auto_income and not raw_auto_expense:
            normalized_policy = True
            if not dry_run:
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

        candidate_ids = _find_candidate_ids(tenant_db)
        synced_ids: list[int] = []
        if not dry_run:
            for work_order_id in candidate_ids:
                detail = costing_service.maybe_auto_sync_by_tenant_policy(tenant_db, work_order_id)
                if detail is not None:
                    synced_ids.append(work_order_id)

        return {
            "tenant_slug": tenant.slug,
            "policy_before": policy_before,
            "normalized_policy": normalized_policy,
            "candidate_ids": candidate_ids,
            "synced_ids": synced_ids,
            "error": None,
        }
    finally:
        tenant_db.close()


def main() -> int:
    args = build_parser().parse_args()
    control_db = ControlSessionLocal()
    try:
        tenant_repository = TenantRepository()
        if args.tenant_slug:
            tenant = tenant_repository.get_by_slug(control_db, args.tenant_slug)
            if tenant is None:
                print(f"Tenant no encontrado: {args.tenant_slug}")
                return 1
            tenants = [tenant]
        else:
            tenants = tenant_repository.list_all(control_db)
            tenants = [
                item
                for item in tenants
                if item.db_name and item.db_user and item.db_host and item.db_port
            ]
            if not args.include_archived:
                tenants = [item for item in tenants if item.status != "archived"]
            tenants = tenants[: max(min(args.limit, 500), 1)]

        processed = 0
        normalized = 0
        synced_work_orders = 0
        failed = 0

        for tenant in tenants:
            processed += 1
            try:
                result = _repair_single_tenant(tenant, dry_run=args.dry_run)
            except Exception as exc:  # pragma: no cover - operational fallback
                failed += 1
                print(f"{tenant.slug}: failed ({exc})")
                continue

            if result["error"]:
                failed += 1
                print(f"{tenant.slug}: failed ({result['error']})")
                continue

            if result["normalized_policy"]:
                normalized += 1

            if args.dry_run:
                print(
                    f"{tenant.slug}: candidates={result['candidate_ids']} "
                    f"normalized_policy={result['normalized_policy']}"
                )
            else:
                synced_work_orders += len(result["synced_ids"])
                print(
                    f"{tenant.slug}: normalized_policy={result['normalized_policy']} "
                    f"candidates={result['candidate_ids']} synced={result['synced_ids']}"
                )

        print(
            "Maintenance-finance repair summary: processed={processed}, normalized={normalized}, "
            "synced_work_orders={synced_work_orders}, failed={failed}, dry_run={dry_run}".format(
                processed=processed,
                normalized=normalized,
                synced_work_orders=synced_work_orders,
                failed=failed,
                dry_run=args.dry_run,
            )
        )
        return 0 if failed == 0 else 1
    finally:
        control_db.close()


if __name__ == "__main__":
    raise SystemExit(main())
