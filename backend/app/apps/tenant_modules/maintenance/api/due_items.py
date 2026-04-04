from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.apps.tenant_modules.maintenance.dependencies import (
    build_maintenance_requested_by,
    require_maintenance_manage,
    require_maintenance_read,
)
from app.apps.tenant_modules.maintenance.schemas import (
    MaintenanceDueItemContactRequest,
    MaintenanceDueItemItemResponse,
    MaintenanceDueItemMutationResponse,
    MaintenanceDueItemPostponeRequest,
    MaintenanceDueItemScheduleRequest,
    MaintenanceDueItemScheduleResponse,
    MaintenanceDueItemsResponse,
    MaintenanceWorkOrderItemResponse,
)
from app.apps.tenant_modules.maintenance.services import MaintenanceDueItemService
from app.common.db.session_manager import get_tenant_db

router = APIRouter(prefix="/tenant/maintenance/due-items", tags=["Tenant Maintenance"])
due_item_service = MaintenanceDueItemService()


def _build_item(item, schedule) -> MaintenanceDueItemItemResponse:
    return MaintenanceDueItemItemResponse(
        id=item.id,
        schedule_id=item.schedule_id,
        client_id=item.client_id,
        site_id=item.site_id,
        installation_id=item.installation_id,
        due_at=item.due_at,
        visible_from=item.visible_from,
        due_status=item.due_status,
        contact_status=item.contact_status,
        assigned_work_group_id=item.assigned_work_group_id,
        assigned_tenant_user_id=item.assigned_tenant_user_id,
        work_order_id=item.work_order_id,
        postponed_until=item.postponed_until,
        contact_note=item.contact_note,
        resolution_note=item.resolution_note,
        schedule_name=schedule.name,
        schedule_description=schedule.description,
        task_type_id=schedule.task_type_id,
        default_priority=schedule.default_priority,
        billing_mode=schedule.billing_mode,
        created_at=item.created_at,
        updated_at=item.updated_at,
    )


def _build_work_order_item(item) -> MaintenanceWorkOrderItemResponse:
    return MaintenanceWorkOrderItemResponse(
        id=item.id,
        client_id=item.client_id,
        site_id=item.site_id,
        installation_id=item.installation_id,
        assigned_work_group_id=item.assigned_work_group_id,
        external_reference=item.external_reference,
        title=item.title,
        description=item.description,
        priority=item.priority,
        scheduled_for=item.scheduled_for,
        cancellation_reason=item.cancellation_reason,
        closure_notes=item.closure_notes,
        assigned_tenant_user_id=item.assigned_tenant_user_id,
        maintenance_status=item.maintenance_status,
        requested_at=item.requested_at,
        completed_at=item.completed_at,
        cancelled_at=item.cancelled_at,
        created_by_user_id=item.created_by_user_id,
        created_at=item.created_at,
        updated_at=item.updated_at,
    )


@router.get("", response_model=MaintenanceDueItemsResponse)
def list_maintenance_due_items(
    client_id: int | None = None,
    site_id: int | None = None,
    due_status: str | None = None,
    current_user=Depends(require_maintenance_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> MaintenanceDueItemsResponse:
    rows = due_item_service.list_due_items(
        tenant_db,
        client_id=client_id,
        site_id=site_id,
        due_status=due_status,
    )
    return MaintenanceDueItemsResponse(
        success=True,
        message="Mantenciones pendientes recuperadas correctamente",
        requested_by=build_maintenance_requested_by(current_user),
        total=len(rows),
        data=[_build_item(item, schedule) for item, schedule in rows],
    )


@router.post("/{due_item_id}/contact", response_model=MaintenanceDueItemMutationResponse)
def update_maintenance_due_item_contact(
    due_item_id: int,
    payload: MaintenanceDueItemContactRequest,
    current_user=Depends(require_maintenance_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> MaintenanceDueItemMutationResponse:
    try:
        due_item_service.update_contact(tenant_db, due_item_id, payload)
        item, schedule = due_item_service.get_due_item(tenant_db, due_item_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return MaintenanceDueItemMutationResponse(
        success=True,
        message="Contacto actualizado correctamente",
        requested_by=build_maintenance_requested_by(current_user),
        data=_build_item(item, schedule),
    )


@router.post("/{due_item_id}/postpone", response_model=MaintenanceDueItemMutationResponse)
def postpone_maintenance_due_item(
    due_item_id: int,
    payload: MaintenanceDueItemPostponeRequest,
    current_user=Depends(require_maintenance_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> MaintenanceDueItemMutationResponse:
    try:
        due_item_service.postpone_due_item(tenant_db, due_item_id, payload)
        item, schedule = due_item_service.get_due_item(tenant_db, due_item_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return MaintenanceDueItemMutationResponse(
        success=True,
        message="Mantencion pendiente pospuesta correctamente",
        requested_by=build_maintenance_requested_by(current_user),
        data=_build_item(item, schedule),
    )


@router.post("/{due_item_id}/schedule", response_model=MaintenanceDueItemScheduleResponse)
def schedule_maintenance_due_item(
    due_item_id: int,
    payload: MaintenanceDueItemScheduleRequest,
    current_user=Depends(require_maintenance_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> MaintenanceDueItemScheduleResponse:
    try:
        item, work_order = due_item_service.schedule_due_item(
            tenant_db,
            due_item_id,
            payload,
            created_by_user_id=current_user["user_id"],
        )
        item, schedule = due_item_service.get_due_item(tenant_db, item.id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return MaintenanceDueItemScheduleResponse(
        success=True,
        message="Mantencion agendada correctamente",
        requested_by=build_maintenance_requested_by(current_user),
        data=_build_item(item, schedule),
        work_order=_build_work_order_item(work_order),
    )
