from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.apps.tenant_modules.business_core.dependencies import (
    build_business_core_requested_by,
    require_business_core_manage,
    require_business_core_read,
)
from app.apps.tenant_modules.business_core.schemas import (
    BusinessCoreStatusUpdateRequest,
    BusinessFunctionProfileCreateRequest,
    BusinessFunctionProfileItemResponse,
    BusinessFunctionProfileMutationResponse,
    BusinessFunctionProfilesResponse,
    BusinessFunctionProfileUpdateRequest,
)
from app.apps.tenant_modules.business_core.services import BusinessFunctionProfileService
from app.common.db.session_manager import get_tenant_db

router = APIRouter(prefix="/tenant/business-core/function-profiles", tags=["Tenant Business Core"])
function_profile_service = BusinessFunctionProfileService()


def _build_function_profile_item(item) -> BusinessFunctionProfileItemResponse:
    return BusinessFunctionProfileItemResponse(
        id=item.id,
        code=item.code,
        name=item.name,
        description=item.description,
        is_active=item.is_active,
        sort_order=item.sort_order,
        created_at=item.created_at,
        updated_at=item.updated_at,
    )


@router.get("", response_model=BusinessFunctionProfilesResponse)
def list_business_function_profiles(
    include_inactive: bool = True,
    current_user=Depends(require_business_core_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> BusinessFunctionProfilesResponse:
    items = function_profile_service.list_function_profiles(
        tenant_db,
        include_inactive=include_inactive,
    )
    return BusinessFunctionProfilesResponse(
        success=True,
        message="Perfiles funcionales recuperados correctamente",
        requested_by=build_business_core_requested_by(current_user),
        total=len(items),
        data=[_build_function_profile_item(item) for item in items],
    )


@router.post("", response_model=BusinessFunctionProfileMutationResponse)
def create_business_function_profile(
    payload: BusinessFunctionProfileCreateRequest,
    current_user=Depends(require_business_core_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> BusinessFunctionProfileMutationResponse:
    try:
        item = function_profile_service.create_function_profile(tenant_db, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return BusinessFunctionProfileMutationResponse(
        success=True,
        message="Perfil funcional creado correctamente",
        requested_by=build_business_core_requested_by(current_user),
        data=_build_function_profile_item(item),
    )


@router.get("/{function_profile_id}", response_model=BusinessFunctionProfileMutationResponse)
def get_business_function_profile(
    function_profile_id: int,
    current_user=Depends(require_business_core_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> BusinessFunctionProfileMutationResponse:
    try:
        item = function_profile_service.get_function_profile(tenant_db, function_profile_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    return BusinessFunctionProfileMutationResponse(
        success=True,
        message="Perfil funcional recuperado correctamente",
        requested_by=build_business_core_requested_by(current_user),
        data=_build_function_profile_item(item),
    )


@router.put("/{function_profile_id}", response_model=BusinessFunctionProfileMutationResponse)
def update_business_function_profile(
    function_profile_id: int,
    payload: BusinessFunctionProfileUpdateRequest,
    current_user=Depends(require_business_core_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> BusinessFunctionProfileMutationResponse:
    try:
        item = function_profile_service.update_function_profile(
            tenant_db,
            function_profile_id,
            payload,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return BusinessFunctionProfileMutationResponse(
        success=True,
        message="Perfil funcional actualizado correctamente",
        requested_by=build_business_core_requested_by(current_user),
        data=_build_function_profile_item(item),
    )


@router.patch("/{function_profile_id}/status", response_model=BusinessFunctionProfileMutationResponse)
def update_business_function_profile_status(
    function_profile_id: int,
    payload: BusinessCoreStatusUpdateRequest,
    current_user=Depends(require_business_core_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> BusinessFunctionProfileMutationResponse:
    try:
        item = function_profile_service.set_function_profile_active(
            tenant_db,
            function_profile_id,
            payload.is_active,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return BusinessFunctionProfileMutationResponse(
        success=True,
        message="Estado del perfil funcional actualizado correctamente",
        requested_by=build_business_core_requested_by(current_user),
        data=_build_function_profile_item(item),
    )


@router.delete("/{function_profile_id}", response_model=BusinessFunctionProfileMutationResponse)
def delete_business_function_profile(
    function_profile_id: int,
    current_user=Depends(require_business_core_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> BusinessFunctionProfileMutationResponse:
    try:
        item = function_profile_service.delete_function_profile(tenant_db, function_profile_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return BusinessFunctionProfileMutationResponse(
        success=True,
        message="Perfil funcional eliminado correctamente",
        requested_by=build_business_core_requested_by(current_user),
        data=_build_function_profile_item(item),
    )
