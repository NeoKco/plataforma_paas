from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from sqlalchemy import func


BACKEND_DIR = Path(__file__).resolve().parents[2]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.apps.tenant_modules.business_core.models.task_type import BusinessTaskType  # noqa: E402
from app.apps.tenant_modules.business_core.models.work_group import BusinessWorkGroup  # noqa: E402
from app.apps.tenant_modules.core.models.user import User  # noqa: E402
from app.apps.tenant_modules.core.services.tenant_connection_service import (  # noqa: E402
    TenantConnectionService,
)
from app.apps.tenant_modules.maintenance.models.work_order import MaintenanceWorkOrder  # noqa: E402
from app.apps.platform_control.repositories.tenant_repository import TenantRepository  # noqa: E402
from app.common.db.control_database import ControlSessionLocal  # noqa: E402


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Backfill responsible group, responsible user and optional task type on completed "
            "maintenance history rows for a tenant."
        )
    )
    parser.add_argument("--tenant-slug")
    parser.add_argument("--all-active", action="store_true")
    parser.add_argument("--user-full-name", required=True)
    parser.add_argument("--group-name", required=True)
    parser.add_argument("--task-type-name", default="mantencion")
    parser.add_argument("--skip-missing", action="store_true")
    parser.add_argument("--limit", type=int, default=100)
    parser.add_argument("--apply", action="store_true")
    return parser.parse_args()


def process_tenant(
    *,
    tenant,
    connection_service: TenantConnectionService,
    user_full_name: str,
    group_name: str,
    task_type_name: str,
    apply_changes: bool,
) -> dict:
    session_factory = connection_service.get_tenant_session(tenant)
    if session_factory is None:
        return {
            "status": "error",
            "tenant_slug": tenant.slug,
            "error": f"tenant has no DB session: {tenant.slug}",
        }

    tenant_db = session_factory()
    try:
        user = (
            tenant_db.query(User)
            .filter(func.lower(User.full_name) == user_full_name.strip().lower())
            .first()
        )
        if user is None:
            return {
                "status": "error",
                "tenant_slug": tenant.slug,
                "error": f"user not found: {user_full_name}",
            }

        group = (
            tenant_db.query(BusinessWorkGroup)
            .filter(func.lower(BusinessWorkGroup.name) == group_name.strip().lower())
            .first()
        )
        if group is None:
            return {
                "status": "error",
                "tenant_slug": tenant.slug,
                "error": f"group not found: {group_name}",
            }

        task_type = (
            tenant_db.query(BusinessTaskType)
            .filter(func.lower(BusinessTaskType.name) == task_type_name.strip().lower())
            .first()
        )
        if task_type is None:
            task_type = (
                tenant_db.query(BusinessTaskType)
                .filter(func.lower(BusinessTaskType.code) == task_type_name.strip().lower())
                .first()
            )

        rows = (
            tenant_db.query(MaintenanceWorkOrder)
            .filter(MaintenanceWorkOrder.maintenance_status == "completed")
            .all()
        )

        updated_group_user = 0
        updated_task_type = 0
        sample_ids: list[int] = []
        for row in rows:
            row_changed = False
            if row.assigned_work_group_id != group.id:
                row.assigned_work_group_id = group.id
                row_changed = True
            if row.assigned_tenant_user_id != user.id:
                row.assigned_tenant_user_id = user.id
                row_changed = True
            if task_type is not None and row.task_type_id is None:
                row.task_type_id = task_type.id
                updated_task_type += 1
                row_changed = True
            if row_changed:
                updated_group_user += 1
                sample_ids.append(row.id)
                if apply_changes:
                    tenant_db.add(row)

        if apply_changes:
            tenant_db.commit()
        else:
            tenant_db.rollback()

        return {
            "status": "ok",
            "tenant_slug": tenant.slug,
            "completed_rows": len(rows),
            "updated_group_user_rows": updated_group_user,
            "updated_task_type_rows": updated_task_type,
            "user_id": user.id,
            "group_id": group.id,
            "task_type_id": task_type.id if task_type is not None else None,
            "sample_work_order_ids": sample_ids[:20],
        }
    except Exception:
        tenant_db.rollback()
        raise
    finally:
        tenant_db.close()


def main() -> int:
    args = parse_args()
    if not args.all_active and not args.tenant_slug:
        print(json.dumps({"status": "error", "error": "--tenant-slug is required unless --all-active is used"}))
        return 1
    if args.tenant_slug:
        args.tenant_slug = args.tenant_slug.strip()
    control_db = ControlSessionLocal()
    try:
        connection_service = TenantConnectionService()
        if args.all_active:
            tenant_repository = TenantRepository()
            tenants = tenant_repository.list_all(control_db)
            processed = 0
            skipped = 0
            failed = 0
            results: list[dict] = []
            for tenant in tenants:
                if tenant.status != "active":
                    continue
                if processed >= max(args.limit, 1):
                    break
                processed += 1
                try:
                    result = process_tenant(
                        tenant=tenant,
                        connection_service=connection_service,
                        user_full_name=args.user_full_name,
                        group_name=args.group_name,
                        task_type_name=args.task_type_name,
                        apply_changes=args.apply,
                    )
                    if result["status"] == "error" and args.skip_missing:
                        skipped += 1
                        result["status"] = "skipped"
                    elif result["status"] == "error":
                        failed += 1
                    results.append(result)
                except Exception as exc:  # pragma: no cover - operational fallback
                    failed += 1
                    results.append(
                        {
                            "status": "error",
                            "tenant_slug": tenant.slug,
                            "error": str(exc),
                        }
                    )
            print(
                json.dumps(
                    {
                        "status": "ok" if failed == 0 else "partial",
                        "mode": "apply" if args.apply else "dry_run",
                        "scope": "all_active",
                        "processed": processed,
                        "skipped": skipped,
                        "failed": failed,
                        "results": results,
                    },
                    ensure_ascii=False,
                    indent=2,
                )
            )
            return 0 if failed == 0 else 1

        tenant = connection_service.get_tenant_by_slug(control_db, args.tenant_slug)
        if tenant is None:
            print(json.dumps({"status": "error", "error": f"tenant not found: {args.tenant_slug}"}))
            return 1
        result = process_tenant(
            tenant=tenant,
            connection_service=connection_service,
            user_full_name=args.user_full_name,
            group_name=args.group_name,
            task_type_name=args.task_type_name,
            apply_changes=args.apply,
        )
        print(
            json.dumps(
                {
                    "mode": "apply" if args.apply else "dry_run",
                    **result,
                },
                ensure_ascii=False,
                indent=2,
            )
        )
        return 0 if result["status"] == "ok" else 1
    finally:
        control_db.close()


if __name__ == "__main__":
    raise SystemExit(main())
