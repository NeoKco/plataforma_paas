from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.apps.tenant_modules.business_core.dependencies import (
    build_business_core_requested_by,
    require_business_core_manage,
    require_business_core_read,
)
from app.apps.tenant_modules.business_core.schemas import (
    BusinessCoreStatusUpdateRequest,
    BusinessOrganizationCreateRequest,
    BusinessOrganizationItemResponse,
    BusinessOrganizationMutationResponse,
    BusinessOrganizationsResponse,
    BusinessOrganizationUpdateRequest,
)
from app.apps.tenant_modules.business_core.services import BusinessOrganizationService
from app.common.db.session_manager import get_tenant_db

router = APIRouter(prefix="/tenant/business-core/organizations", tags=["Tenant Business Core"])
organization_service = BusinessOrganizationService()


def _build_organization_item(organization) -> BusinessOrganizationItemResponse:
    return BusinessOrganizationItemResponse(
        id=organization.id,
        name=organization.name,
        legal_name=organization.legal_name,
        tax_id=organization.tax_id,
        organization_kind=organization.organization_kind,
        phone=organization.phone,
        email=organization.email,
        notes=organization.notes,
        is_active=organization.is_active,
        sort_order=organization.sort_order,
        created_at=organization.created_at,
        updated_at=organization.updated_at,
    )


@router.get("", response_model=BusinessOrganizationsResponse)
def list_business_organizations(
    organization_kind: str | None = None,
    include_inactive: bool = True,
    current_user=Depends(require_business_core_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> BusinessOrganizationsResponse:
    organizations = organization_service.list_organizations(
        tenant_db,
        organization_kind=organization_kind,
        include_inactive=include_inactive,
    )
    return BusinessOrganizationsResponse(
        success=True,
        message="Organizaciones recuperadas correctamente",
        requested_by=build_business_core_requested_by(current_user),
        total=len(organizations),
        data=[_build_organization_item(organization) for organization in organizations],
    )


@router.post("", response_model=BusinessOrganizationMutationResponse)
def create_business_organization(
    payload: BusinessOrganizationCreateRequest,
    current_user=Depends(require_business_core_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> BusinessOrganizationMutationResponse:
    try:
        organization = organization_service.create_organization(tenant_db, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return BusinessOrganizationMutationResponse(
        success=True,
        message="Organizacion creada correctamente",
        requested_by=build_business_core_requested_by(current_user),
        data=_build_organization_item(organization),
    )


@router.get("/{organization_id}", response_model=BusinessOrganizationMutationResponse)
def get_business_organization(
    organization_id: int,
    current_user=Depends(require_business_core_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> BusinessOrganizationMutationResponse:
    try:
        organization = organization_service.get_organization(tenant_db, organization_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    return BusinessOrganizationMutationResponse(
        success=True,
        message="Organizacion recuperada correctamente",
        requested_by=build_business_core_requested_by(current_user),
        data=_build_organization_item(organization),
    )


@router.put("/{organization_id}", response_model=BusinessOrganizationMutationResponse)
def update_business_organization(
    organization_id: int,
    payload: BusinessOrganizationUpdateRequest,
    current_user=Depends(require_business_core_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> BusinessOrganizationMutationResponse:
    try:
        organization = organization_service.update_organization(
            tenant_db,
            organization_id,
            payload,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return BusinessOrganizationMutationResponse(
        success=True,
        message="Organizacion actualizada correctamente",
        requested_by=build_business_core_requested_by(current_user),
        data=_build_organization_item(organization),
    )


@router.patch("/{organization_id}/status", response_model=BusinessOrganizationMutationResponse)
def update_business_organization_status(
    organization_id: int,
    payload: BusinessCoreStatusUpdateRequest,
    current_user=Depends(require_business_core_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> BusinessOrganizationMutationResponse:
    try:
        organization = organization_service.set_organization_active(
            tenant_db,
            organization_id,
            payload.is_active,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return BusinessOrganizationMutationResponse(
        success=True,
        message="Estado de la organizacion actualizado correctamente",
        requested_by=build_business_core_requested_by(current_user),
        data=_build_organization_item(organization),
    )


@router.delete("/{organization_id}", response_model=BusinessOrganizationMutationResponse)
def delete_business_organization(
    organization_id: int,
    current_user=Depends(require_business_core_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> BusinessOrganizationMutationResponse:
    try:
        organization = organization_service.delete_organization(tenant_db, organization_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return BusinessOrganizationMutationResponse(
        success=True,
        message="Organizacion eliminada correctamente",
        requested_by=build_business_core_requested_by(current_user),
        data=_build_organization_item(organization),
    )
