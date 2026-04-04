from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.apps.tenant_modules.maintenance.dependencies import (
    build_maintenance_requested_by,
    require_maintenance_manage,
    require_maintenance_read,
)
from app.apps.tenant_modules.maintenance.schemas import (
    MaintenanceStatusUpdateRequest,
    MaintenanceWorkOrderCreateRequest,
    MaintenanceWorkOrderItemResponse,
    MaintenanceWorkOrderMutationResponse,
    MaintenanceWorkOrdersResponse,
    MaintenanceWorkOrderUpdateRequest,
)
from app.apps.tenant_modules.maintenance.services import MaintenanceWorkOrderService
from app.common.db.session_manager import get_tenant_db

router = APIRouter(prefix="/tenant/maintenance/work-orders", tags=["Tenant Maintenance"])
work_order_service = MaintenanceWorkOrderService()


def _build_item(item) -> MaintenanceWorkOrderItemResponse:
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


@router.get("", response_model=MaintenanceWorkOrdersResponse)
def list_maintenance_work_orders(
    client_id: int | None = None,
    site_id: int | None = None,
    maintenance_status: str | None = None,
    current_user=Depends(require_maintenance_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> MaintenanceWorkOrdersResponse:
    items = work_order_service.list_work_orders(
        tenant_db,
        client_id=client_id,
        site_id=site_id,
        maintenance_status=maintenance_status,
    )
    return MaintenanceWorkOrdersResponse(
        success=True,
        message="Mantenciones recuperadas correctamente",
        requested_by=build_maintenance_requested_by(current_user),
        total=len(items),
        data=[_build_item(item) for item in items],
    )


@router.post("", response_model=MaintenanceWorkOrderMutationResponse)
def create_maintenance_work_order(
    payload: MaintenanceWorkOrderCreateRequest,
    current_user=Depends(require_maintenance_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> MaintenanceWorkOrderMutationResponse:
    try:
        item = work_order_service.create_work_order(
            tenant_db,
            payload,
            created_by_user_id=current_user["user_id"],
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return MaintenanceWorkOrderMutationResponse(
        success=True,
        message="Mantencion creada correctamente",
        requested_by=build_maintenance_requested_by(current_user),
        data=_build_item(item),
    )


@router.get("/{work_order_id}", response_model=MaintenanceWorkOrderMutationResponse)
def get_maintenance_work_order(
    work_order_id: int,
    current_user=Depends(require_maintenance_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> MaintenanceWorkOrderMutationResponse:
    try:
        item = work_order_service.get_work_order(tenant_db, work_order_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return MaintenanceWorkOrderMutationResponse(
        success=True,
        message="Mantencion recuperada correctamente",
        requested_by=build_maintenance_requested_by(current_user),
        data=_build_item(item),
    )


@router.put("/{work_order_id}", response_model=MaintenanceWorkOrderMutationResponse)
def update_maintenance_work_order(
    work_order_id: int,
    payload: MaintenanceWorkOrderUpdateRequest,
    current_user=Depends(require_maintenance_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> MaintenanceWorkOrderMutationResponse:
    try:
        item = work_order_service.update_work_order(
            tenant_db,
            work_order_id,
            payload,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return MaintenanceWorkOrderMutationResponse(
        success=True,
        message="Mantencion actualizada correctamente",
        requested_by=build_maintenance_requested_by(current_user),
        data=_build_item(item),
    )


@router.patch("/{work_order_id}/status", response_model=MaintenanceWorkOrderMutationResponse)
def update_maintenance_work_order_status(
    work_order_id: int,
    payload: MaintenanceStatusUpdateRequest,
    current_user=Depends(require_maintenance_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> MaintenanceWorkOrderMutationResponse:
    try:
        item = work_order_service.update_work_order_status(
            tenant_db,
            work_order_id,
            payload,
            changed_by_user_id=current_user["user_id"],
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return MaintenanceWorkOrderMutationResponse(
        success=True,
        message="Estado de la mantencion actualizado correctamente",
        requested_by=build_maintenance_requested_by(current_user),
        data=_build_item(item),
    )


@router.delete("/{work_order_id}", response_model=MaintenanceWorkOrderMutationResponse)
def delete_maintenance_work_order(
    work_order_id: int,
    current_user=Depends(require_maintenance_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> MaintenanceWorkOrderMutationResponse:
    try:
        item = work_order_service.delete_work_order(tenant_db, work_order_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return MaintenanceWorkOrderMutationResponse(
        success=True,
        message="Mantencion eliminada correctamente",
        requested_by=build_maintenance_requested_by(current_user),
        data=_build_item(item),
    )
