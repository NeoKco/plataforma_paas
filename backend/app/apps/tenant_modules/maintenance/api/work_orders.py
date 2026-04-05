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
from app.apps.tenant_modules.maintenance.services import (
    MaintenanceWorkOrderConflictError,
    MaintenanceWorkOrderService,
)
from app.common.db.session_manager import get_tenant_db

router = APIRouter(prefix="/tenant/maintenance/work-orders", tags=["Tenant Maintenance"])
work_order_service = MaintenanceWorkOrderService()


def _build_item(item) -> MaintenanceWorkOrderItemResponse:
    return MaintenanceWorkOrderItemResponse(
        id=item.id,
        client_id=item.client_id,
        site_id=item.site_id,
        installation_id=item.installation_id,
        assigned_work_group_id=getattr(item, "assigned_work_group_id", None),
        external_reference=getattr(item, "external_reference", None),
        title=item.title,
        description=getattr(item, "description", None),
        priority=item.priority,
        scheduled_for=getattr(item, "scheduled_for", None),
        cancellation_reason=getattr(item, "cancellation_reason", None),
        closure_notes=getattr(item, "closure_notes", None),
        assigned_tenant_user_id=getattr(item, "assigned_tenant_user_id", None),
        maintenance_status=item.maintenance_status,
        requested_at=getattr(item, "requested_at", None),
        completed_at=getattr(item, "completed_at", None),
        cancelled_at=getattr(item, "cancelled_at", None),
        created_by_user_id=getattr(item, "created_by_user_id", None),
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
    except MaintenanceWorkOrderConflictError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
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
            changed_by_user_id=current_user["user_id"],
        )
    except MaintenanceWorkOrderConflictError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
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
    except MaintenanceWorkOrderConflictError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
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
