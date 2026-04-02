from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.apps.tenant_modules.business_core.dependencies import (
    build_business_core_requested_by,
    require_business_core_manage,
    require_business_core_read,
)
from app.apps.tenant_modules.business_core.schemas import (
    BusinessCoreStatusUpdateRequest,
    BusinessTaskTypeCreateRequest,
    BusinessTaskTypeItemResponse,
    BusinessTaskTypeMutationResponse,
    BusinessTaskTypesResponse,
    BusinessTaskTypeUpdateRequest,
)
from app.apps.tenant_modules.business_core.services import BusinessTaskTypeService
from app.common.db.session_manager import get_tenant_db

router = APIRouter(prefix="/tenant/business-core/task-types", tags=["Tenant Business Core"])
task_type_service = BusinessTaskTypeService()


def _build_task_type_item(item) -> BusinessTaskTypeItemResponse:
    return BusinessTaskTypeItemResponse(
        id=item.id,
        code=item.code,
        name=item.name,
        description=item.description,
        color=item.color,
        icon=item.icon,
        is_active=item.is_active,
        sort_order=item.sort_order,
        created_at=item.created_at,
        updated_at=item.updated_at,
    )


@router.get("", response_model=BusinessTaskTypesResponse)
def list_business_task_types(
    include_inactive: bool = True,
    current_user=Depends(require_business_core_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> BusinessTaskTypesResponse:
    items = task_type_service.list_task_types(
        tenant_db,
        include_inactive=include_inactive,
    )
    return BusinessTaskTypesResponse(
        success=True,
        message="Tipos de tarea recuperados correctamente",
        requested_by=build_business_core_requested_by(current_user),
        total=len(items),
        data=[_build_task_type_item(item) for item in items],
    )


@router.post("", response_model=BusinessTaskTypeMutationResponse)
def create_business_task_type(
    payload: BusinessTaskTypeCreateRequest,
    current_user=Depends(require_business_core_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> BusinessTaskTypeMutationResponse:
    try:
        item = task_type_service.create_task_type(tenant_db, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return BusinessTaskTypeMutationResponse(
        success=True,
        message="Tipo de tarea creado correctamente",
        requested_by=build_business_core_requested_by(current_user),
        data=_build_task_type_item(item),
    )


@router.get("/{task_type_id}", response_model=BusinessTaskTypeMutationResponse)
def get_business_task_type(
    task_type_id: int,
    current_user=Depends(require_business_core_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> BusinessTaskTypeMutationResponse:
    try:
        item = task_type_service.get_task_type(tenant_db, task_type_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    return BusinessTaskTypeMutationResponse(
        success=True,
        message="Tipo de tarea recuperado correctamente",
        requested_by=build_business_core_requested_by(current_user),
        data=_build_task_type_item(item),
    )


@router.put("/{task_type_id}", response_model=BusinessTaskTypeMutationResponse)
def update_business_task_type(
    task_type_id: int,
    payload: BusinessTaskTypeUpdateRequest,
    current_user=Depends(require_business_core_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> BusinessTaskTypeMutationResponse:
    try:
        item = task_type_service.update_task_type(
            tenant_db,
            task_type_id,
            payload,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return BusinessTaskTypeMutationResponse(
        success=True,
        message="Tipo de tarea actualizado correctamente",
        requested_by=build_business_core_requested_by(current_user),
        data=_build_task_type_item(item),
    )


@router.patch("/{task_type_id}/status", response_model=BusinessTaskTypeMutationResponse)
def update_business_task_type_status(
    task_type_id: int,
    payload: BusinessCoreStatusUpdateRequest,
    current_user=Depends(require_business_core_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> BusinessTaskTypeMutationResponse:
    try:
        item = task_type_service.set_task_type_active(
            tenant_db,
            task_type_id,
            payload.is_active,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return BusinessTaskTypeMutationResponse(
        success=True,
        message="Estado del tipo de tarea actualizado correctamente",
        requested_by=build_business_core_requested_by(current_user),
        data=_build_task_type_item(item),
    )


@router.delete("/{task_type_id}", response_model=BusinessTaskTypeMutationResponse)
def delete_business_task_type(
    task_type_id: int,
    current_user=Depends(require_business_core_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> BusinessTaskTypeMutationResponse:
    try:
        item = task_type_service.delete_task_type(tenant_db, task_type_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return BusinessTaskTypeMutationResponse(
        success=True,
        message="Tipo de tarea eliminado correctamente",
        requested_by=build_business_core_requested_by(current_user),
        data=_build_task_type_item(item),
    )
