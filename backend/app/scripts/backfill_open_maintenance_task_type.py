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
from app.apps.tenant_modules.core.services.tenant_connection_service import (  # noqa: E402
    TenantConnectionService,
)
from app.apps.tenant_modules.maintenance.models.work_order import MaintenanceWorkOrder  # noqa: E402
from app.common.db.control_database import ControlSessionLocal  # noqa: E402


def normalize_search_label(value: str | None) -> str:
    return (
        (value or "")
        .strip()
        .lower()
        .replace("á", "a")
        .replace("é", "e")
        .replace("í", "i")
        .replace("ó", "o")
        .replace("ú", "u")
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Backfill default task type on open maintenance work orders with null task_type_id."
    )
    parser.add_argument("--tenant-slug", required=True, help="Active tenant slug")
    parser.add_argument("--task-type-name", default="mantencion", help="Task type name/code to apply")
    parser.add_argument("--apply", action="store_true")
    return parser.parse_args()


def resolve_task_type_id(tenant_db, task_type_name: str) -> int | None:
    search = normalize_search_label(task_type_name)
    for item in tenant_db.query(BusinessTaskType).all():
        if normalize_search_label(item.name) == search or normalize_search_label(item.code) == search:
            return item.id
    for item in tenant_db.query(BusinessTaskType).all():
        normalized_name = normalize_search_label(item.name)
        normalized_code = normalize_search_label(item.code)
        if search in normalized_name or search in normalized_code:
            return item.id
    return None


def main() -> int:
    args = parse_args()
    control_db = ControlSessionLocal()
    try:
        connection_service = TenantConnectionService()
        tenant = connection_service.get_tenant_by_slug(control_db, args.tenant_slug.strip())
        if tenant is None:
            print(json.dumps({"status": "error", "error": f"tenant not found: {args.tenant_slug}"}))
            return 1

        session_factory = connection_service.get_tenant_session(tenant)
        if session_factory is None:
            print(json.dumps({"status": "error", "error": f"tenant has no DB session: {tenant.slug}"}))
            return 1

        tenant_db = session_factory()
        try:
            task_type_id = resolve_task_type_id(tenant_db, args.task_type_name)
            if task_type_id is None:
                print(
                    json.dumps(
                        {
                            "status": "error",
                            "tenant_slug": tenant.slug,
                            "error": f"task type not found: {args.task_type_name}",
                        }
                    )
                )
                return 1

            rows = (
                tenant_db.query(MaintenanceWorkOrder)
                .filter(MaintenanceWorkOrder.maintenance_status.in_(["scheduled", "in_progress"]))
                .filter(MaintenanceWorkOrder.task_type_id.is_(None))
                .order_by(MaintenanceWorkOrder.id.asc())
                .all()
            )

            changed_ids: list[int] = []
            for row in rows:
                row.task_type_id = task_type_id
                changed_ids.append(row.id)
                if args.apply:
                    tenant_db.add(row)

            if args.apply:
                tenant_db.commit()
            else:
                tenant_db.rollback()

            print(
                json.dumps(
                    {
                        "status": "ok",
                        "tenant_slug": tenant.slug,
                        "mode": "apply" if args.apply else "dry_run",
                        "task_type_id": task_type_id,
                        "open_rows_without_task_type": len(rows),
                        "changed_ids": changed_ids[:50],
                    },
                    ensure_ascii=False,
                    indent=2,
                )
            )
            return 0
        finally:
            tenant_db.close()
    finally:
        control_db.close()


if __name__ == "__main__":
    raise SystemExit(main())
