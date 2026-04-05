from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.apps.tenant_modules.business_core.dependencies import (
    build_business_core_requested_by,
    require_business_core_manage,
    require_business_core_read,
)
from app.apps.tenant_modules.business_core.schemas import (
    BusinessAssetTypeCreateRequest,
    BusinessAssetTypeItemResponse,
    BusinessAssetTypeMutationResponse,
    BusinessAssetTypesResponse,
    BusinessAssetTypeUpdateRequest,
)
from app.apps.tenant_modules.business_core.services import BusinessAssetTypeService
from app.common.db.session_manager import get_tenant_db

router = APIRouter(prefix="/tenant/business-core/asset-types", tags=["Tenant Business Core"])
service = BusinessAssetTypeService()


def _build_item(item) -> BusinessAssetTypeItemResponse:
    return BusinessAssetTypeItemResponse(
        id=item.id,
        code=item.code,
        name=item.name,
        description=item.description,
        is_active=item.is_active,
        sort_order=item.sort_order,
        created_at=item.created_at,
        updated_at=item.updated_at,
    )


@router.get("", response_model=BusinessAssetTypesResponse)
def list_asset_types(
    include_inactive: bool = True,
    current_user=Depends(require_business_core_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> BusinessAssetTypesResponse:
    items = service.list_asset_types(tenant_db, include_inactive=include_inactive)
    return BusinessAssetTypesResponse(
        success=True,
        message="Tipos de activo recuperados correctamente",
        requested_by=build_business_core_requested_by(current_user),
        total=len(items),
        data=[_build_item(item) for item in items],
    )


@router.post("", response_model=BusinessAssetTypeMutationResponse)
def create_asset_type(
    payload: BusinessAssetTypeCreateRequest,
    current_user=Depends(require_business_core_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> BusinessAssetTypeMutationResponse:
    try:
        item = service.create_asset_type(tenant_db, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return BusinessAssetTypeMutationResponse(
        success=True,
        message="Tipo de activo creado correctamente",
        requested_by=build_business_core_requested_by(current_user),
        data=_build_item(item),
    )


@router.put("/{asset_type_id}", response_model=BusinessAssetTypeMutationResponse)
def update_asset_type(
    asset_type_id: int,
    payload: BusinessAssetTypeUpdateRequest,
    current_user=Depends(require_business_core_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> BusinessAssetTypeMutationResponse:
    try:
        item = service.update_asset_type(tenant_db, asset_type_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return BusinessAssetTypeMutationResponse(
        success=True,
        message="Tipo de activo actualizado correctamente",
        requested_by=build_business_core_requested_by(current_user),
        data=_build_item(item),
    )


@router.patch("/{asset_type_id}/status", response_model=BusinessAssetTypeMutationResponse)
def update_asset_type_status(
    asset_type_id: int,
    payload: dict,
    current_user=Depends(require_business_core_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> BusinessAssetTypeMutationResponse:
    try:
        item = service.set_asset_type_active(tenant_db, asset_type_id, bool(payload.get("is_active", True)))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return BusinessAssetTypeMutationResponse(
        success=True,
        message="Estado del tipo de activo actualizado correctamente",
        requested_by=build_business_core_requested_by(current_user),
        data=_build_item(item),
    )


@router.delete("/{asset_type_id}", response_model=BusinessAssetTypeMutationResponse)
def delete_asset_type(
    asset_type_id: int,
    current_user=Depends(require_business_core_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> BusinessAssetTypeMutationResponse:
    try:
        item = service.delete_asset_type(tenant_db, asset_type_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return BusinessAssetTypeMutationResponse(
        success=True,
        message="Tipo de activo eliminado correctamente",
        requested_by=build_business_core_requested_by(current_user),
        data=_build_item(item),
    )
