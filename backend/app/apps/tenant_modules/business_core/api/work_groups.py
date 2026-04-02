from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.apps.tenant_modules.business_core.dependencies import (
    build_business_core_requested_by,
    require_business_core_manage,
    require_business_core_read,
)
from app.apps.tenant_modules.business_core.schemas import (
    BusinessCoreStatusUpdateRequest,
    BusinessWorkGroupCreateRequest,
    BusinessWorkGroupItemResponse,
    BusinessWorkGroupMutationResponse,
    BusinessWorkGroupsResponse,
    BusinessWorkGroupUpdateRequest,
)
from app.apps.tenant_modules.business_core.services import BusinessWorkGroupService
from app.common.db.session_manager import get_tenant_db

router = APIRouter(prefix="/tenant/business-core/work-groups", tags=["Tenant Business Core"])
work_group_service = BusinessWorkGroupService()


def _build_work_group_item(item) -> BusinessWorkGroupItemResponse:
    return BusinessWorkGroupItemResponse(
        id=item.id,
        code=item.code,
        name=item.name,
        description=item.description,
        group_kind=item.group_kind,
        is_active=item.is_active,
        sort_order=item.sort_order,
        created_at=item.created_at,
        updated_at=item.updated_at,
    )


@router.get("", response_model=BusinessWorkGroupsResponse)
def list_business_work_groups(
    include_inactive: bool = True,
    group_kind: str | None = None,
    current_user=Depends(require_business_core_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> BusinessWorkGroupsResponse:
    items = work_group_service.list_work_groups(
        tenant_db,
        include_inactive=include_inactive,
        group_kind=group_kind,
    )
    return BusinessWorkGroupsResponse(
        success=True,
        message="Grupos de trabajo recuperados correctamente",
        requested_by=build_business_core_requested_by(current_user),
        total=len(items),
        data=[_build_work_group_item(item) for item in items],
    )


@router.post("", response_model=BusinessWorkGroupMutationResponse)
def create_business_work_group(
    payload: BusinessWorkGroupCreateRequest,
    current_user=Depends(require_business_core_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> BusinessWorkGroupMutationResponse:
    try:
        item = work_group_service.create_work_group(tenant_db, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return BusinessWorkGroupMutationResponse(
        success=True,
        message="Grupo de trabajo creado correctamente",
        requested_by=build_business_core_requested_by(current_user),
        data=_build_work_group_item(item),
    )


@router.get("/{work_group_id}", response_model=BusinessWorkGroupMutationResponse)
def get_business_work_group(
    work_group_id: int,
    current_user=Depends(require_business_core_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> BusinessWorkGroupMutationResponse:
    try:
        item = work_group_service.get_work_group(tenant_db, work_group_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    return BusinessWorkGroupMutationResponse(
        success=True,
        message="Grupo de trabajo recuperado correctamente",
        requested_by=build_business_core_requested_by(current_user),
        data=_build_work_group_item(item),
    )


@router.put("/{work_group_id}", response_model=BusinessWorkGroupMutationResponse)
def update_business_work_group(
    work_group_id: int,
    payload: BusinessWorkGroupUpdateRequest,
    current_user=Depends(require_business_core_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> BusinessWorkGroupMutationResponse:
    try:
        item = work_group_service.update_work_group(
            tenant_db,
            work_group_id,
            payload,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return BusinessWorkGroupMutationResponse(
        success=True,
        message="Grupo de trabajo actualizado correctamente",
        requested_by=build_business_core_requested_by(current_user),
        data=_build_work_group_item(item),
    )


@router.patch("/{work_group_id}/status", response_model=BusinessWorkGroupMutationResponse)
def update_business_work_group_status(
    work_group_id: int,
    payload: BusinessCoreStatusUpdateRequest,
    current_user=Depends(require_business_core_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> BusinessWorkGroupMutationResponse:
    try:
        item = work_group_service.set_work_group_active(
            tenant_db,
            work_group_id,
            payload.is_active,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return BusinessWorkGroupMutationResponse(
        success=True,
        message="Estado del grupo de trabajo actualizado correctamente",
        requested_by=build_business_core_requested_by(current_user),
        data=_build_work_group_item(item),
    )


@router.delete("/{work_group_id}", response_model=BusinessWorkGroupMutationResponse)
def delete_business_work_group(
    work_group_id: int,
    current_user=Depends(require_business_core_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> BusinessWorkGroupMutationResponse:
    try:
        item = work_group_service.delete_work_group(tenant_db, work_group_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return BusinessWorkGroupMutationResponse(
        success=True,
        message="Grupo de trabajo eliminado correctamente",
        requested_by=build_business_core_requested_by(current_user),
        data=_build_work_group_item(item),
    )
