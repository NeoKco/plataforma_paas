from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.apps.tenant_modules.maintenance.dependencies import (
    build_maintenance_requested_by,
    require_maintenance_manage,
    require_maintenance_read,
)
from app.apps.tenant_modules.maintenance.schemas import (
    MaintenanceScheduleCreateRequest,
    MaintenanceScheduleItemResponse,
    MaintenanceScheduleMutationResponse,
    MaintenanceScheduleSuggestionItemResponse,
    MaintenanceScheduleSuggestionResponse,
    MaintenanceSchedulesResponse,
    MaintenanceScheduleStatusRequest,
    MaintenanceScheduleUpdateRequest,
)
from app.apps.tenant_modules.maintenance.services import (
    MaintenanceDueItemService,
    MaintenanceScheduleService,
)
from app.common.db.session_manager import get_tenant_db

router = APIRouter(prefix="/tenant/maintenance/schedules", tags=["Tenant Maintenance"])
schedule_service = MaintenanceScheduleService()
due_item_service = MaintenanceDueItemService()


def _build_item(item) -> MaintenanceScheduleItemResponse:
    return MaintenanceScheduleItemResponse(
        id=item.id,
        client_id=item.client_id,
        site_id=item.site_id,
        installation_id=item.installation_id,
        task_type_id=item.task_type_id,
        name=item.name,
        description=item.description,
        frequency_value=item.frequency_value,
        frequency_unit=item.frequency_unit,
        lead_days=item.lead_days,
        start_mode=item.start_mode,
        base_date=item.base_date,
        last_executed_at=item.last_executed_at,
        next_due_at=item.next_due_at,
        default_priority=item.default_priority,
        estimated_duration_minutes=item.estimated_duration_minutes,
        billing_mode=item.billing_mode,
        is_active=item.is_active,
        auto_create_due_items=item.auto_create_due_items,
        notes=item.notes,
        created_by_user_id=item.created_by_user_id,
        created_at=item.created_at,
        updated_at=item.updated_at,
    )


def _build_suggestion_item(data: dict) -> MaintenanceScheduleSuggestionItemResponse:
    return MaintenanceScheduleSuggestionItemResponse(
        client_id=data["client_id"],
        site_id=data["site_id"],
        installation_id=data["installation_id"],
        suggested_next_due_at=data["suggested_next_due_at"],
        last_executed_at=data["last_executed_at"],
        source=data["source"],
        reference_work_order_id=data["reference_work_order_id"],
        reference_completed_at=data["reference_completed_at"],
    )


@router.get("", response_model=MaintenanceSchedulesResponse)
def list_maintenance_schedules(
    client_id: int | None = None,
    site_id: int | None = None,
    installation_id: int | None = None,
    include_inactive: bool = True,
    current_user=Depends(require_maintenance_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> MaintenanceSchedulesResponse:
    items = schedule_service.list_schedules(
        tenant_db,
        client_id=client_id,
        site_id=site_id,
        installation_id=installation_id,
        include_inactive=include_inactive,
    )
    return MaintenanceSchedulesResponse(
        success=True,
        message="Programaciones recuperadas correctamente",
        requested_by=build_maintenance_requested_by(current_user),
        total=len(items),
        data=[_build_item(item) for item in items],
    )


@router.get("/suggestion", response_model=MaintenanceScheduleSuggestionResponse)
def get_maintenance_schedule_suggestion(
    client_id: int,
    site_id: int | None = None,
    installation_id: int | None = None,
    current_user=Depends(require_maintenance_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> MaintenanceScheduleSuggestionResponse:
    try:
        item = schedule_service.suggest_schedule_seed(
            tenant_db,
            client_id=client_id,
            site_id=site_id,
            installation_id=installation_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return MaintenanceScheduleSuggestionResponse(
        success=True,
        message="Sugerencia de programacion calculada correctamente",
        requested_by=build_maintenance_requested_by(current_user),
        data=_build_suggestion_item(item),
    )


@router.post("", response_model=MaintenanceScheduleMutationResponse)
def create_maintenance_schedule(
    payload: MaintenanceScheduleCreateRequest,
    current_user=Depends(require_maintenance_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> MaintenanceScheduleMutationResponse:
    try:
        item = schedule_service.create_schedule(
            tenant_db,
            payload,
            created_by_user_id=current_user["user_id"],
        )
        due_item_service.generate_due_items(tenant_db)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return MaintenanceScheduleMutationResponse(
        success=True,
        message="Programacion creada correctamente",
        requested_by=build_maintenance_requested_by(current_user),
        data=_build_item(item),
    )


@router.get("/{schedule_id}", response_model=MaintenanceScheduleMutationResponse)
def get_maintenance_schedule(
    schedule_id: int,
    current_user=Depends(require_maintenance_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> MaintenanceScheduleMutationResponse:
    try:
        item = schedule_service.get_schedule(tenant_db, schedule_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return MaintenanceScheduleMutationResponse(
        success=True,
        message="Programacion recuperada correctamente",
        requested_by=build_maintenance_requested_by(current_user),
        data=_build_item(item),
    )


@router.put("/{schedule_id}", response_model=MaintenanceScheduleMutationResponse)
def update_maintenance_schedule(
    schedule_id: int,
    payload: MaintenanceScheduleUpdateRequest,
    current_user=Depends(require_maintenance_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> MaintenanceScheduleMutationResponse:
    try:
        item = schedule_service.update_schedule(tenant_db, schedule_id, payload)
        due_item_service.generate_due_items(tenant_db)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return MaintenanceScheduleMutationResponse(
        success=True,
        message="Programacion actualizada correctamente",
        requested_by=build_maintenance_requested_by(current_user),
        data=_build_item(item),
    )


@router.patch("/{schedule_id}/status", response_model=MaintenanceScheduleMutationResponse)
def update_maintenance_schedule_status(
    schedule_id: int,
    payload: MaintenanceScheduleStatusRequest,
    current_user=Depends(require_maintenance_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> MaintenanceScheduleMutationResponse:
    try:
        item = schedule_service.set_schedule_active(
            tenant_db,
            schedule_id,
            is_active=payload.is_active,
        )
        due_item_service.generate_due_items(tenant_db)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return MaintenanceScheduleMutationResponse(
        success=True,
        message="Estado de la programacion actualizado correctamente",
        requested_by=build_maintenance_requested_by(current_user),
        data=_build_item(item),
    )
