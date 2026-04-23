from __future__ import annotations

import argparse
import sys
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parents[2]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.apps.platform_control.models.tenant import Tenant  # noqa: E402
from app.apps.platform_control.services.tenant_service import TenantService  # noqa: E402
from app.common.db.control_database import ControlSessionLocal  # noqa: E402


tenant_service = TenantService()


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description=(
            "Migra tenants legacy desde `plan_code` al contrato formal "
            "`Plan Base + add-ons`, retirando el baseline legacy cuando aplica."
        )
    )
    target_group = parser.add_mutually_exclusive_group(required=True)
    target_group.add_argument("--tenant-slug", help="Slug de tenant único")
    target_group.add_argument(
        "--all-active",
        action="store_true",
        help="Incluye todos los tenants activos",
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
        help="Incluye tenants archivados cuando se usa --all-active",
    )
    parser.add_argument(
        "--base-plan-code",
        default=None,
        help="Plan Base opcional a forzar en la migración",
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Aplica cambios. Por defecto solo audita",
    )
    return parser


def _build_query(control_db, args: argparse.Namespace):
    query = control_db.query(Tenant)
    if args.tenant_slug:
        query = query.filter(Tenant.slug == args.tenant_slug)
    elif not args.include_archived:
        query = query.filter(Tenant.status == "active")
    return query.order_by(Tenant.slug.asc())


def main() -> int:
    args = build_parser().parse_args()
    control_db = ControlSessionLocal()
    try:
        query = _build_query(control_db, args)
        if args.all_active:
            query = query.limit(args.limit)
        tenants = query.all()

        processed = 0
        migrated = 0
        skipped = 0
        failed = 0

        for tenant in tenants:
            processed += 1
            baseline_state = tenant_service.get_tenant_baseline_policy_state(tenant)
            activation_state = tenant_service.get_tenant_module_activation_state(tenant)
            if not getattr(tenant, "plan_code", None):
                skipped += 1
                print(
                    f"[SKIP] {tenant.slug}: sin `plan_code`; "
                    f"modelo={baseline_state.source or 'none'}"
                )
                continue

            if args.apply:
                try:
                    updated = tenant_service.migrate_legacy_plan_to_subscription_contract(
                        control_db,
                        tenant.id,
                        base_plan_code=args.base_plan_code,
                    )
                    control_db.commit()
                except Exception as exc:  # pragma: no cover - salida CLI
                    control_db.rollback()
                    failed += 1
                    print(f"[FAIL] {tenant.slug}: {exc}")
                    continue

                migrated += 1
                updated_activation = tenant_service.get_tenant_module_activation_state(updated)
                print(
                    f"[OK] {updated.slug}: base_plan="
                    f"{updated_activation.subscription_base_plan_code or 'none'} "
                    f"addons={','.join(updated_activation.subscription_addon_modules or ()) or 'none'} "
                    f"legacy_plan_code={updated.plan_code or 'none'} "
                    f"source={updated_activation.activation_source or 'none'}"
                )
                continue

            inferred_cycle = (
                activation_state.subscription_billing_cycle
                or tenant_service.tenant_module_subscription_policy_service.infer_billing_cycle_from_legacy_plan_code(
                    tenant.plan_code
                )
            )
            inferred_addons = (
                tenant_service._collect_active_subscription_addon_items(getattr(tenant, "subscription", None))
                or tenant_service._infer_subscription_addon_items_from_legacy_plan(
                    tenant.plan_code,
                    billing_cycle=inferred_cycle,
                )
            )
            print(
                f"[AUDIT] {tenant.slug}: plan_code={tenant.plan_code} "
                f"managed={baseline_state.subscription_contract_managed} "
                f"legacy_fallback={baseline_state.legacy_plan_fallback_active} "
                f"base_plan={(args.base_plan_code or activation_state.subscription_base_plan_code or tenant_service.tenant_module_subscription_policy_service.DEFAULT_BASE_PLAN_CODE)} "
                f"billing_cycle={inferred_cycle} "
                f"addons={','.join(item['module_key'] for item in inferred_addons) or 'none'}"
            )

        print(
            "Legacy contract migration summary: "
            f"processed={processed}, migrated={migrated}, skipped={skipped}, failed={failed}, "
            f"mode={'apply' if args.apply else 'audit'}"
        )
        return 1 if failed else 0
    finally:
        control_db.close()


if __name__ == "__main__":
    raise SystemExit(main())
