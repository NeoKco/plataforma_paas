from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.apps.tenant_modules.maintenance.dependencies import (
    build_maintenance_requested_by,
    require_maintenance_read,
)
from app.apps.tenant_modules.maintenance.schemas import (
    MaintenanceHistoryResponse,
    MaintenanceHistoryWorkOrderItemResponse,
    MaintenanceStatusLogItemResponse,
    MaintenanceStatusLogsResponse,
    MaintenanceVisitItemResponse,
    MaintenanceVisitsResponse,
)
from app.apps.tenant_modules.maintenance.services import MaintenanceHistoryService
from app.common.db.session_manager import get_tenant_db

router = APIRouter(prefix="/tenant/maintenance", tags=["Tenant Maintenance"])
history_service = MaintenanceHistoryService()


def _build_status_log_item(item) -> MaintenanceStatusLogItemResponse:
    return MaintenanceStatusLogItemResponse(
        id=item.id,
        work_order_id=item.work_order_id,
        from_status=item.from_status,
        to_status=item.to_status,
        note=item.note,
        changed_by_user_id=item.changed_by_user_id,
        changed_at=item.changed_at,
    )


def _build_visit_item(item) -> MaintenanceVisitItemResponse:
    return MaintenanceVisitItemResponse(
        id=item.id,
        work_order_id=item.work_order_id,
        visit_status=item.visit_status,
        scheduled_start_at=item.scheduled_start_at,
        scheduled_end_at=item.scheduled_end_at,
        actual_start_at=item.actual_start_at,
        actual_end_at=item.actual_end_at,
        assigned_work_group_id=item.assigned_work_group_id,
        assigned_tenant_user_id=item.assigned_tenant_user_id,
        assigned_group_label=item.assigned_group_label,
        notes=item.notes,
        created_at=item.created_at,
        updated_at=item.updated_at,
    )


def _build_history_item(entry: dict) -> MaintenanceHistoryWorkOrderItemResponse:
    item = entry["work_order"]
    return MaintenanceHistoryWorkOrderItemResponse(
        id=item.id,
        client_id=item.client_id,
        site_id=item.site_id,
        installation_id=item.installation_id,
        external_reference=item.external_reference,
        title=item.title,
        description=item.description,
        priority=item.priority,
        cancellation_reason=item.cancellation_reason,
        closure_notes=item.closure_notes,
        assigned_work_group_id=item.assigned_work_group_id,
        assigned_tenant_user_id=item.assigned_tenant_user_id,
        maintenance_status=item.maintenance_status,
        requested_at=item.requested_at,
        scheduled_for=item.scheduled_for,
        completed_at=item.completed_at,
        cancelled_at=item.cancelled_at,
        created_by_user_id=item.created_by_user_id,
        created_at=item.created_at,
        updated_at=item.updated_at,
        status_logs=[_build_status_log_item(log) for log in entry["status_logs"]],
        visits=[_build_visit_item(visit) for visit in entry["visits"]],
    )


@router.get("/history", response_model=MaintenanceHistoryResponse)
def list_maintenance_history(
    client_id: int | None = None,
    site_id: int | None = None,
    current_user=Depends(require_maintenance_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> MaintenanceHistoryResponse:
    entries = history_service.list_history(
        tenant_db,
        client_id=client_id,
        site_id=site_id,
    )
    return MaintenanceHistoryResponse(
        success=True,
        message="Historial tecnico recuperado correctamente",
        requested_by=build_maintenance_requested_by(current_user),
        total=len(entries),
        data=[_build_history_item(entry) for entry in entries],
    )


@router.get("/work-orders/{work_order_id}/status-logs", response_model=MaintenanceStatusLogsResponse)
def list_maintenance_status_logs(
    work_order_id: int,
    current_user=Depends(require_maintenance_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> MaintenanceStatusLogsResponse:
    try:
        items = history_service.list_status_logs(tenant_db, work_order_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    return MaintenanceStatusLogsResponse(
        success=True,
        message="Trazabilidad recuperada correctamente",
        requested_by=build_maintenance_requested_by(current_user),
        total=len(items),
        data=[_build_status_log_item(item) for item in items],
    )


@router.get("/work-orders/{work_order_id}/visits", response_model=MaintenanceVisitsResponse)
def list_maintenance_visits(
    work_order_id: int,
    current_user=Depends(require_maintenance_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> MaintenanceVisitsResponse:
    try:
        items = history_service.list_visits(tenant_db, work_order_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    return MaintenanceVisitsResponse(
        success=True,
        message="Visitas recuperadas correctamente",
        requested_by=build_maintenance_requested_by(current_user),
        total=len(items),
        data=[_build_visit_item(item) for item in items],
    )
