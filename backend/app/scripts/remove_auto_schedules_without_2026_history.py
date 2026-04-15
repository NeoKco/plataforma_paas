from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parents[2]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.apps.tenant_modules.business_core.models.client import BusinessClient  # noqa: E402,F401
from app.apps.tenant_modules.business_core.models.site import BusinessSite  # noqa: E402,F401
from app.apps.tenant_modules.business_core.models.task_type import BusinessTaskType  # noqa: E402,F401
from app.apps.tenant_modules.core.services.tenant_connection_service import (  # noqa: E402
    TenantConnectionService,
)
from app.apps.tenant_modules.maintenance.models.due_item import MaintenanceDueItem  # noqa: E402
from app.apps.tenant_modules.maintenance.models.installation import MaintenanceInstallation  # noqa: E402,F401
from app.apps.tenant_modules.maintenance.models.schedule import MaintenanceSchedule  # noqa: E402
from app.common.db.control_database import ControlSessionLocal  # noqa: E402


AUTO_NOTES = "Alta automática desde instalaciones activas sin plan preventivo."


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Remove auto-created annual preventive schedules that were created without a completed "
            "maintenance in the current year."
        )
    )
    parser.add_argument("--tenant-slug", required=True, help="Active tenant slug")
    parser.add_argument("--apply", action="store_true", help="Persist the cleanup")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    control_db = ControlSessionLocal()
    try:
        connection_service = TenantConnectionService()
        tenant = connection_service.get_tenant_by_slug(control_db, args.tenant_slug)
        if tenant is None:
            print(json.dumps({"status": "error", "error": f"tenant not found: {args.tenant_slug}"}))
            return 1
        session_factory = connection_service.get_tenant_session(tenant)
        if session_factory is None:
            print(json.dumps({"status": "error", "error": f"tenant session unavailable: {args.tenant_slug}"}))
            return 1

        tenant_db = session_factory()
        try:
            schedules = (
                tenant_db.query(MaintenanceSchedule)
                .filter(MaintenanceSchedule.notes == AUTO_NOTES)
                .filter(MaintenanceSchedule.frequency_value == 1)
                .filter(MaintenanceSchedule.frequency_unit == "years")
                .filter(MaintenanceSchedule.last_executed_at.is_(None))
                .order_by(MaintenanceSchedule.id.asc())
                .all()
            )
            schedule_ids = [item.id for item in schedules]
            due_items_count = 0
            if schedule_ids:
                due_items_count = (
                    tenant_db.query(MaintenanceDueItem)
                    .filter(MaintenanceDueItem.schedule_id.in_(schedule_ids))
                    .count()
                )

            if args.apply:
                if schedule_ids:
                    (
                        tenant_db.query(MaintenanceDueItem)
                        .filter(MaintenanceDueItem.schedule_id.in_(schedule_ids))
                        .delete(synchronize_session=False)
                    )
                for item in schedules:
                    tenant_db.delete(item)
                tenant_db.commit()
            else:
                tenant_db.rollback()

            print(
                json.dumps(
                    {
                        "status": "ok",
                        "mode": "apply" if args.apply else "dry_run",
                        "tenant_slug": args.tenant_slug,
                        "schedules_detected": len(schedules),
                        "due_items_detected": due_items_count,
                        "schedule_ids": schedule_ids,
                    },
                    ensure_ascii=False,
                    indent=2,
                )
            )
            return 0
        except Exception:
            tenant_db.rollback()
            raise
        finally:
            tenant_db.close()
    finally:
        control_db.close()


if __name__ == "__main__":
    raise SystemExit(main())
