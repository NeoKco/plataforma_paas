from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from zoneinfo import ZoneInfo


BACKEND_DIR = Path(__file__).resolve().parents[2]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from sqlalchemy.orm import Session  # noqa: E402

from app.apps.tenant_modules.business_core.models.client import BusinessClient  # noqa: E402
from app.apps.tenant_modules.business_core.models.site import BusinessSite  # noqa: E402
from app.apps.tenant_modules.business_core.models.task_type import BusinessTaskType  # noqa: E402
from app.apps.tenant_modules.core.services.tenant_connection_service import (  # noqa: E402
    TenantConnectionService,
)
from app.apps.tenant_modules.maintenance.models.installation import (  # noqa: E402
    MaintenanceInstallation,
)
from app.apps.tenant_modules.maintenance.repositories.schedule_repository import (  # noqa: E402
    MaintenanceScheduleRepository,
)
from app.apps.tenant_modules.maintenance.schemas.schedule import (  # noqa: E402
    MaintenanceScheduleCreateRequest,
)
from app.apps.tenant_modules.maintenance.services.due_item_service import (  # noqa: E402
    MaintenanceDueItemService,
)
from app.apps.tenant_modules.maintenance.services.schedule_service import (  # noqa: E402
    MaintenanceScheduleService,
)
from app.common.db.control_database import ControlSessionLocal  # noqa: E402


TENANT_TIMEZONE = ZoneInfo("America/Santiago")
AUTO_NOTES = "Alta automática desde instalaciones activas sin plan preventivo."


@dataclass
class UncoveredInstallation:
    installation: MaintenanceInstallation
    site: BusinessSite
    client: BusinessClient


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Create annual preventive schedules for active installations without preventive coverage."
        )
    )
    parser.add_argument("--tenant-slug", required=True, help="Active tenant slug")
    parser.add_argument("--apply", action="store_true", help="Persist the created schedules")
    return parser.parse_args()


def _normalize_label(value: str | None) -> str:
    return " ".join((value or "").strip().casefold().split())


def _resolve_default_task_type_id(tenant_db: Session) -> int | None:
    task_types = (
        tenant_db.query(BusinessTaskType)
        .filter(BusinessTaskType.is_active.is_(True))
        .order_by(BusinessTaskType.sort_order.asc(), BusinessTaskType.id.asc())
        .all()
    )
    for item in task_types:
        label = _normalize_label(item.name)
        if "mantencion" in label or "maintenance" in label:
            return item.id
    return None


def _build_annual_next_due_at() -> datetime:
    local_now = datetime.now(TENANT_TIMEZONE)
    try:
        next_local = local_now.replace(
            year=local_now.year + 1,
            month=local_now.month,
            day=local_now.day,
            hour=9,
            minute=0,
            second=0,
            microsecond=0,
        )
    except ValueError:
        next_local = local_now.replace(
            year=local_now.year + 1,
            month=2,
            day=28,
            hour=9,
            minute=0,
            second=0,
            microsecond=0,
        )
    return next_local.astimezone(timezone.utc)


def _list_uncovered_installations(tenant_db: Session) -> list[UncoveredInstallation]:
    active_schedules = MaintenanceScheduleRepository().list_active(tenant_db)
    sites_by_id = {
        item.id: item
        for item in tenant_db.query(BusinessSite).filter(BusinessSite.is_active.is_(True)).all()
    }
    clients_by_id = {
        item.id: item
        for item in tenant_db.query(BusinessClient).filter(BusinessClient.is_active.is_(True)).all()
    }
    installations = (
        tenant_db.query(MaintenanceInstallation)
        .filter(MaintenanceInstallation.is_active.is_(True))
        .order_by(MaintenanceInstallation.id.asc())
        .all()
    )
    uncovered: list[UncoveredInstallation] = []
    for installation in installations:
        site = sites_by_id.get(installation.site_id)
        if site is None:
            continue
        client = clients_by_id.get(site.client_id)
        if client is None:
            continue
        covered = False
        for schedule in active_schedules:
            if schedule.client_id != client.id:
                continue
            if schedule.installation_id == installation.id:
                covered = True
                break
            if schedule.installation_id is None and schedule.site_id == site.id:
                covered = True
                break
            if schedule.installation_id is None and schedule.site_id is None:
                covered = True
                break
        if covered:
            continue
        uncovered.append(
            UncoveredInstallation(
                installation=installation,
                site=site,
                client=client,
            )
        )
    return uncovered


def _build_payload(
    tenant_db: Session,
    schedule_service: MaintenanceScheduleService,
    item: UncoveredInstallation,
    *,
    task_type_id: int | None,
) -> MaintenanceScheduleCreateRequest:
    suggestion = schedule_service.suggest_schedule_seed(
        tenant_db,
        client_id=item.client.id,
        site_id=item.site.id,
        installation_id=item.installation.id,
    )
    use_historical_seed = (
        suggestion.get("source") == "history_completed_this_year"
        and suggestion.get("suggested_next_due_at") is not None
    )
    return MaintenanceScheduleCreateRequest(
        client_id=item.client.id,
        site_id=item.site.id,
        installation_id=item.installation.id,
        task_type_id=task_type_id,
        cost_template_id=None,
        name=f"Plan preventivo {item.installation.name}",
        description=None,
        frequency_value=1,
        frequency_unit="years",
        lead_days=30,
        start_mode="from_manual_due_date",
        base_date=None,
        last_executed_at=suggestion.get("last_executed_at") if use_historical_seed else None,
        next_due_at=suggestion.get("suggested_next_due_at") if use_historical_seed else _build_annual_next_due_at(),
        default_priority="normal",
        estimated_duration_minutes=60,
        billing_mode="per_work_order",
        estimate_target_margin_percent=0,
        estimate_notes=None,
        is_active=True,
        auto_create_due_items=True,
        notes=AUTO_NOTES,
        estimate_lines=[],
    )


def _build_item_summary(item: UncoveredInstallation, payload: MaintenanceScheduleCreateRequest) -> dict[str, object]:
    return {
        "installation_id": item.installation.id,
        "installation_name": item.installation.name,
        "site_id": item.site.id,
        "site_name": item.site.name,
        "client_id": item.client.id,
        "next_due_at": payload.next_due_at.isoformat(),
        "frequency_value": payload.frequency_value,
        "frequency_unit": payload.frequency_unit,
        "task_type_id": payload.task_type_id,
    }


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
            schedule_service = MaintenanceScheduleService()
            due_item_service = MaintenanceDueItemService()
            task_type_id = _resolve_default_task_type_id(tenant_db)
            uncovered = _list_uncovered_installations(tenant_db)
            created: list[dict[str, object]] = []
            skipped: list[dict[str, object]] = []
            failures: list[dict[str, object]] = []

            for item in uncovered:
                payload = _build_payload(
                    tenant_db,
                    schedule_service,
                    item,
                    task_type_id=task_type_id,
                )
                summary = _build_item_summary(item, payload)
                if not args.apply:
                    created.append(summary)
                    continue
                try:
                    schedule = schedule_service.create_schedule(
                        tenant_db,
                        payload,
                        created_by_user_id=None,
                    )
                    summary["schedule_id"] = schedule.id
                    created.append(summary)
                except ValueError as exc:
                    detail = str(exc)
                    if "Ya existe una programacion activa equivalente" in detail:
                        summary["reason"] = detail
                        skipped.append(summary)
                        continue
                    summary["error"] = detail
                    failures.append(summary)

            generated_due_items = 0
            if args.apply:
                generated_due_items = len(due_item_service.generate_due_items(tenant_db))
                tenant_db.commit()
            else:
                tenant_db.rollback()

            print(
                json.dumps(
                    {
                        "status": "ok",
                        "mode": "apply" if args.apply else "dry_run",
                        "tenant_slug": args.tenant_slug,
                        "task_type_id": task_type_id,
                        "uncovered_detected": len(uncovered),
                        "created": len(created),
                        "skipped": len(skipped),
                        "failed": len(failures),
                        "generated_due_items": generated_due_items,
                        "items": created,
                        "skipped_items": skipped,
                        "failed_items": failures,
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
