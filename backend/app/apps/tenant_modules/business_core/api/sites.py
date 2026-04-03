from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.apps.tenant_modules.business_core.dependencies import (
    build_business_core_requested_by,
    require_business_core_manage,
    require_business_core_read,
)
from app.apps.tenant_modules.business_core.schemas import (
    BusinessCoreStatusUpdateRequest,
    BusinessSiteCreateRequest,
    BusinessSiteItemResponse,
    BusinessSiteMutationResponse,
    BusinessSitesResponse,
    BusinessSiteUpdateRequest,
)
from app.apps.tenant_modules.business_core.services import BusinessSiteService
from app.common.db.session_manager import get_tenant_db

router = APIRouter(prefix="/tenant/business-core/sites", tags=["Tenant Business Core"])
site_service = BusinessSiteService()


def _build_site_item(site) -> BusinessSiteItemResponse:
    return BusinessSiteItemResponse(
        id=site.id,
        client_id=site.client_id,
        name=site.name,
        site_code=site.site_code,
        address_line=site.address_line,
        commune=site.commune,
        city=site.city,
        region=site.region,
        country_code=site.country_code,
        reference_notes=site.reference_notes,
        is_active=site.is_active,
        sort_order=site.sort_order,
        created_at=site.created_at,
        updated_at=site.updated_at,
    )


@router.get("", response_model=BusinessSitesResponse)
def list_business_sites(
    client_id: int | None = None,
    include_inactive: bool = True,
    current_user=Depends(require_business_core_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> BusinessSitesResponse:
    sites = site_service.list_sites(
        tenant_db,
        client_id=client_id,
        include_inactive=include_inactive,
    )
    return BusinessSitesResponse(
        success=True,
        message="Sitios recuperados correctamente",
        requested_by=build_business_core_requested_by(current_user),
        total=len(sites),
        data=[_build_site_item(site) for site in sites],
    )


@router.post("", response_model=BusinessSiteMutationResponse)
def create_business_site(
    payload: BusinessSiteCreateRequest,
    current_user=Depends(require_business_core_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> BusinessSiteMutationResponse:
    try:
        site = site_service.create_site(tenant_db, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return BusinessSiteMutationResponse(
        success=True,
        message="Sitio creado correctamente",
        requested_by=build_business_core_requested_by(current_user),
        data=_build_site_item(site),
    )


@router.get("/{site_id}", response_model=BusinessSiteMutationResponse)
def get_business_site(
    site_id: int,
    current_user=Depends(require_business_core_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> BusinessSiteMutationResponse:
    try:
        site = site_service.get_site(tenant_db, site_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    return BusinessSiteMutationResponse(
        success=True,
        message="Sitio recuperado correctamente",
        requested_by=build_business_core_requested_by(current_user),
        data=_build_site_item(site),
    )


@router.put("/{site_id}", response_model=BusinessSiteMutationResponse)
def update_business_site(
    site_id: int,
    payload: BusinessSiteUpdateRequest,
    current_user=Depends(require_business_core_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> BusinessSiteMutationResponse:
    try:
        site = site_service.update_site(tenant_db, site_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return BusinessSiteMutationResponse(
        success=True,
        message="Sitio actualizado correctamente",
        requested_by=build_business_core_requested_by(current_user),
        data=_build_site_item(site),
    )


@router.patch("/{site_id}/status", response_model=BusinessSiteMutationResponse)
def update_business_site_status(
    site_id: int,
    payload: BusinessCoreStatusUpdateRequest,
    current_user=Depends(require_business_core_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> BusinessSiteMutationResponse:
    try:
        site = site_service.set_site_active(
            tenant_db,
            site_id,
            payload.is_active,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return BusinessSiteMutationResponse(
        success=True,
        message="Estado del sitio actualizado correctamente",
        requested_by=build_business_core_requested_by(current_user),
        data=_build_site_item(site),
    )


@router.delete("/{site_id}", response_model=BusinessSiteMutationResponse)
def delete_business_site(
    site_id: int,
    current_user=Depends(require_business_core_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> BusinessSiteMutationResponse:
    try:
        site = site_service.delete_site(tenant_db, site_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return BusinessSiteMutationResponse(
        success=True,
        message="Sitio eliminado correctamente",
        requested_by=build_business_core_requested_by(current_user),
        data=_build_site_item(site),
    )
