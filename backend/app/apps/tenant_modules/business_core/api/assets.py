from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.apps.tenant_modules.business_core.dependencies import (
    build_business_core_requested_by,
    require_business_core_manage,
    require_business_core_read,
)
from app.apps.tenant_modules.business_core.models import BusinessAssetType, BusinessSite
from app.apps.tenant_modules.business_core.schemas import (
    BusinessAssetCreateRequest,
    BusinessAssetItemResponse,
    BusinessAssetMutationResponse,
    BusinessAssetsResponse,
    BusinessAssetUpdateRequest,
)
from app.apps.tenant_modules.business_core.services import BusinessAssetService
from app.common.db.session_manager import get_tenant_db

router = APIRouter(prefix="/tenant/business-core/assets", tags=["Tenant Business Core"])
service = BusinessAssetService()


def _build_item(tenant_db: Session, item) -> BusinessAssetItemResponse:
    site = tenant_db.query(BusinessSite).filter(BusinessSite.id == item.site_id).first()
    asset_type = tenant_db.query(BusinessAssetType).filter(BusinessAssetType.id == item.asset_type_id).first()
    site_label = (site.address_line or site.name) if site else f"#{item.site_id}"
    return BusinessAssetItemResponse(
        id=item.id,
        site_id=item.site_id,
        asset_type_id=item.asset_type_id,
        name=item.name,
        asset_code=item.asset_code,
        serial_number=item.serial_number,
        manufacturer=item.manufacturer,
        model=item.model,
        asset_status=item.asset_status,
        installed_at=item.installed_at,
        last_service_at=item.last_service_at,
        warranty_until=item.warranty_until,
        location_note=item.location_note,
        technical_notes=item.technical_notes,
        is_active=item.is_active,
        sort_order=item.sort_order,
        site_name=site.name if site else f"#{item.site_id}",
        site_label=site_label,
        asset_type_name=asset_type.name if asset_type else f"#{item.asset_type_id}",
        created_at=item.created_at,
        updated_at=item.updated_at,
    )


@router.get("", response_model=BusinessAssetsResponse)
def list_assets(
    site_id: int | None = None,
    include_inactive: bool = True,
    current_user=Depends(require_business_core_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> BusinessAssetsResponse:
    items = service.list_assets(tenant_db, site_id=site_id, include_inactive=include_inactive)
    return BusinessAssetsResponse(
        success=True,
        message="Activos recuperados correctamente",
        requested_by=build_business_core_requested_by(current_user),
        total=len(items),
        data=[_build_item(tenant_db, item) for item in items],
    )


@router.post("", response_model=BusinessAssetMutationResponse)
def create_asset(
    payload: BusinessAssetCreateRequest,
    current_user=Depends(require_business_core_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> BusinessAssetMutationResponse:
    try:
        item = service.create_asset(tenant_db, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return BusinessAssetMutationResponse(
        success=True,
        message="Activo creado correctamente",
        requested_by=build_business_core_requested_by(current_user),
        data=_build_item(tenant_db, item),
    )


@router.put("/{asset_id}", response_model=BusinessAssetMutationResponse)
def update_asset(
    asset_id: int,
    payload: BusinessAssetUpdateRequest,
    current_user=Depends(require_business_core_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> BusinessAssetMutationResponse:
    try:
        item = service.update_asset(tenant_db, asset_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return BusinessAssetMutationResponse(
        success=True,
        message="Activo actualizado correctamente",
        requested_by=build_business_core_requested_by(current_user),
        data=_build_item(tenant_db, item),
    )


@router.patch("/{asset_id}/status", response_model=BusinessAssetMutationResponse)
def update_asset_status(
    asset_id: int,
    payload: dict,
    current_user=Depends(require_business_core_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> BusinessAssetMutationResponse:
    try:
        item = service.set_asset_active(tenant_db, asset_id, bool(payload.get("is_active", True)))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return BusinessAssetMutationResponse(
        success=True,
        message="Estado del activo actualizado correctamente",
        requested_by=build_business_core_requested_by(current_user),
        data=_build_item(tenant_db, item),
    )


@router.delete("/{asset_id}", response_model=BusinessAssetMutationResponse)
def delete_asset(
    asset_id: int,
    current_user=Depends(require_business_core_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> BusinessAssetMutationResponse:
    try:
        item = service.delete_asset(tenant_db, asset_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return BusinessAssetMutationResponse(
        success=True,
        message="Activo eliminado correctamente",
        requested_by=build_business_core_requested_by(current_user),
        data=_build_item(tenant_db, item),
    )
