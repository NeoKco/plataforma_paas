from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.apps.tenant_modules.maintenance.dependencies import (
    build_maintenance_requested_by,
    require_maintenance_manage,
    require_maintenance_read,
)
from app.apps.tenant_modules.maintenance.schemas import (
    MaintenanceVisitCreateRequest,
    MaintenanceVisitItemResponse,
    MaintenanceVisitMutationResponse,
    MaintenanceVisitsResponse,
    MaintenanceVisitUpdateRequest,
)
from app.apps.tenant_modules.maintenance.services import MaintenanceVisitService
from app.common.db.session_manager import get_tenant_db

router = APIRouter(prefix="/tenant/maintenance/visits", tags=["Tenant Maintenance"])
visit_service = MaintenanceVisitService()


def _build_visit_item(item) -> MaintenanceVisitItemResponse:
    return MaintenanceVisitItemResponse(
        id=item.id,
        work_order_id=item.work_order_id,
        visit_type=getattr(item, "visit_type", "execution"),
        visit_status=item.visit_status,
        visit_result=getattr(item, "visit_result", None),
        scheduled_start_at=getattr(item, "scheduled_start_at", None),
        scheduled_end_at=getattr(item, "scheduled_end_at", None),
        actual_start_at=getattr(item, "actual_start_at", None),
        actual_end_at=getattr(item, "actual_end_at", None),
        assigned_work_group_id=getattr(item, "assigned_work_group_id", None),
        assigned_tenant_user_id=getattr(item, "assigned_tenant_user_id", None),
        assigned_group_label=getattr(item, "assigned_group_label", None),
        notes=getattr(item, "notes", None),
        created_at=item.created_at,
        updated_at=item.updated_at,
    )


@router.get("", response_model=MaintenanceVisitsResponse)
def list_maintenance_visits_catalog(
    work_order_id: int | None = None,
    visit_status: str | None = None,
    current_user=Depends(require_maintenance_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> MaintenanceVisitsResponse:
    items = visit_service.list_visits(
        tenant_db,
        work_order_id=work_order_id,
        visit_status=visit_status,
    )
    return MaintenanceVisitsResponse(
        success=True,
        message="Visitas recuperadas correctamente",
        requested_by=build_maintenance_requested_by(current_user),
        total=len(items),
        data=[_build_visit_item(item) for item in items],
    )


@router.post("", response_model=MaintenanceVisitMutationResponse)
def create_maintenance_visit(
    payload: MaintenanceVisitCreateRequest,
    current_user=Depends(require_maintenance_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> MaintenanceVisitMutationResponse:
    try:
        item = visit_service.create_visit(tenant_db, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return MaintenanceVisitMutationResponse(
        success=True,
        message="Visita creada correctamente",
        requested_by=build_maintenance_requested_by(current_user),
        data=_build_visit_item(item),
    )


@router.get("/{visit_id}", response_model=MaintenanceVisitMutationResponse)
def get_maintenance_visit(
    visit_id: int,
    current_user=Depends(require_maintenance_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> MaintenanceVisitMutationResponse:
    try:
        item = visit_service.get_visit(tenant_db, visit_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return MaintenanceVisitMutationResponse(
        success=True,
        message="Visita recuperada correctamente",
        requested_by=build_maintenance_requested_by(current_user),
        data=_build_visit_item(item),
    )


@router.put("/{visit_id}", response_model=MaintenanceVisitMutationResponse)
def update_maintenance_visit(
    visit_id: int,
    payload: MaintenanceVisitUpdateRequest,
    current_user=Depends(require_maintenance_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> MaintenanceVisitMutationResponse:
    try:
        item = visit_service.update_visit(tenant_db, visit_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return MaintenanceVisitMutationResponse(
        success=True,
        message="Visita actualizada correctamente",
        requested_by=build_maintenance_requested_by(current_user),
        data=_build_visit_item(item),
    )


@router.delete("/{visit_id}", response_model=MaintenanceVisitMutationResponse)
def delete_maintenance_visit(
    visit_id: int,
    current_user=Depends(require_maintenance_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> MaintenanceVisitMutationResponse:
    try:
        item = visit_service.delete_visit(tenant_db, visit_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return MaintenanceVisitMutationResponse(
        success=True,
        message="Visita eliminada correctamente",
        requested_by=build_maintenance_requested_by(current_user),
        data=_build_visit_item(item),
    )
