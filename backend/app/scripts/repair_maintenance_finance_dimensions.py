from __future__ import annotations

import argparse
import sys
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parents[2]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.apps.platform_control.repositories.tenant_repository import TenantRepository  # noqa: E402
from app.apps.tenant_modules.core.services.tenant_connection_service import (  # noqa: E402
    TenantConnectionService,
)
from app.apps.tenant_modules.finance.models.transaction import FinanceTransaction  # noqa: E402
from app.apps.tenant_modules.maintenance.services.costing_service import (  # noqa: E402
    MaintenanceCostingService,
)
from app.common.db.control_database import ControlSessionLocal  # noqa: E402


tenant_connection_service = TenantConnectionService()
costing_service = MaintenanceCostingService()


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description=(
            "Completa cuenta/categoría faltantes en transacciones financieras "
            "de Mantenciones usando los defaults efectivos actuales del tenant."
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
        "--apply",
        action="store_true",
        help="Aplica cambios; sin esto solo informa",
    )
    return parser


def _open_tenant_session(tenant):
    session_factory = tenant_connection_service.get_tenant_session(tenant)
    return session_factory()


def _repair_single_tenant(tenant, *, apply: bool) -> dict:
    tenant_db = None
    try:
        tenant_db = _open_tenant_session(tenant)
        defaults = costing_service.get_finance_sync_defaults(tenant_db)
        income_account_id = defaults.get("maintenance_finance_income_account_id")
        expense_account_id = defaults.get("maintenance_finance_expense_account_id")
        income_category_id = defaults.get("maintenance_finance_income_category_id")
        expense_category_id = defaults.get("maintenance_finance_expense_category_id")

        transactions = (
            tenant_db.query(FinanceTransaction)
            .filter(
                FinanceTransaction.source_type.in_(
                    [
                        "maintenance_work_order_income",
                        "maintenance_work_order_expense",
                    ]
                ),
                FinanceTransaction.is_voided.is_(False),
            )
            .order_by(FinanceTransaction.transaction_at.asc(), FinanceTransaction.id.asc())
            .all()
        )

        scanned = 0
        updated = 0
        skipped_without_defaults = 0
        unchanged = 0
        updated_ids: list[int] = []

        for transaction in transactions:
            scanned += 1
            if transaction.source_type == "maintenance_work_order_income":
                resolved_account_id = transaction.account_id or income_account_id
                resolved_category_id = transaction.category_id or income_category_id
            else:
                resolved_account_id = transaction.account_id or expense_account_id
                resolved_category_id = transaction.category_id or expense_category_id

            if resolved_account_id is None and resolved_category_id is None:
                skipped_without_defaults += 1
                continue

            if (
                transaction.account_id == resolved_account_id
                and transaction.category_id == resolved_category_id
            ):
                unchanged += 1
                continue

            if transaction.account_id is None and resolved_account_id is not None:
                transaction.account_id = resolved_account_id
            if transaction.category_id is None and resolved_category_id is not None:
                transaction.category_id = resolved_category_id
            tenant_db.add(transaction)
            updated += 1
            updated_ids.append(transaction.id)

        if apply:
            tenant_db.commit()
        else:
            tenant_db.rollback()

        return {
            "tenant_slug": tenant.slug,
            "scanned": scanned,
            "updated": updated,
            "updated_ids": updated_ids,
            "unchanged": unchanged,
            "skipped_without_defaults": skipped_without_defaults,
            "error": None,
        }
    except Exception as exc:  # pragma: no cover - operational fallback
        if tenant_db is not None:
            tenant_db.rollback()
        return {
            "tenant_slug": tenant.slug,
            "scanned": 0,
            "updated": 0,
            "updated_ids": [],
            "unchanged": 0,
            "skipped_without_defaults": 0,
            "error": str(exc),
        }
    finally:
        if tenant_db is not None:
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
                if item.status == "active"
                and item.db_name
                and item.db_user
                and item.db_host
                and item.db_port
            ]
            tenants = tenants[: max(min(args.limit, 500), 1)]

        processed = 0
        updated = 0
        failed = 0

        for tenant in tenants:
            processed += 1
            result = _repair_single_tenant(tenant, apply=args.apply)
            if result["error"]:
                failed += 1
                print(f"{tenant.slug}: failed ({result['error']})")
                continue
            updated += result["updated"]
            print(
                f"{tenant.slug}: scanned={result['scanned']} updated={result['updated']} "
                f"unchanged={result['unchanged']} skipped_without_defaults={result['skipped_without_defaults']} "
                f"updated_ids={result['updated_ids']}"
            )

        print(
            "Maintenance finance dimensions repair summary: processed={processed}, updated={updated}, failed={failed}, apply={apply}".format(
                processed=processed,
                updated=updated,
                failed=failed,
                apply=args.apply,
            )
        )
        return 0 if failed == 0 else 1
    finally:
        control_db.close()


if __name__ == "__main__":
    raise SystemExit(main())
