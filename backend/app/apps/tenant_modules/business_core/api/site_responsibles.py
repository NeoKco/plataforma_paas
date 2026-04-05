from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.apps.tenant_modules.business_core.dependencies import (
    build_business_core_requested_by,
    require_business_core_manage,
    require_business_core_read,
)
from app.apps.tenant_modules.business_core.schemas import (
    BusinessSiteResponsibleCreateRequest,
    BusinessSiteResponsibleItemResponse,
    BusinessSiteResponsibleMutationResponse,
    BusinessSiteResponsiblesResponse,
    BusinessSiteResponsibleUpdateRequest,
)
from app.apps.tenant_modules.business_core.services import BusinessSiteResponsibleService
from app.apps.tenant_modules.core.models.user import User
from app.common.db.session_manager import get_tenant_db

router = APIRouter(prefix="/tenant/business-core/site-responsibles", tags=["Tenant Business Core"])
site_responsible_service = BusinessSiteResponsibleService()


def _build_item(tenant_db: Session, item) -> BusinessSiteResponsibleItemResponse:
    user = tenant_db.query(User).filter(User.id == item.tenant_user_id).first()
    site_label = item.site.address_line or item.site.name or f"#{item.site_id}"
    return BusinessSiteResponsibleItemResponse(
        id=item.id,
        site_id=item.site_id,
        tenant_user_id=item.tenant_user_id,
        responsibility_kind=item.responsibility_kind,
        is_primary=item.is_primary,
        is_active=item.is_active,
        starts_at=item.starts_at,
        ends_at=item.ends_at,
        notes=item.notes,
        site_name=item.site.name if item.site else f"#{item.site_id}",
        site_label=site_label,
        user_full_name=user.full_name if user else f"#{item.tenant_user_id}",
        user_email=user.email if user else "—",
        created_at=item.created_at,
        updated_at=item.updated_at,
    )


@router.get("", response_model=BusinessSiteResponsiblesResponse)
def list_site_responsibles(
    site_id: int | None = None,
    current_user=Depends(require_business_core_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> BusinessSiteResponsiblesResponse:
    items = site_responsible_service.list_responsibles(tenant_db, site_id=site_id)
    return BusinessSiteResponsiblesResponse(
        success=True,
        message="Responsables de sitio recuperados correctamente",
        requested_by=build_business_core_requested_by(current_user),
        total=len(items),
        data=[_build_item(tenant_db, item) for item in items],
    )


@router.post("", response_model=BusinessSiteResponsibleMutationResponse)
def create_site_responsible(
    payload: BusinessSiteResponsibleCreateRequest,
    current_user=Depends(require_business_core_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> BusinessSiteResponsibleMutationResponse:
    try:
        item = site_responsible_service.create_responsible(tenant_db, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return BusinessSiteResponsibleMutationResponse(
        success=True,
        message="Responsable de sitio creado correctamente",
        requested_by=build_business_core_requested_by(current_user),
        data=_build_item(tenant_db, item),
    )


@router.put("/{responsible_id}", response_model=BusinessSiteResponsibleMutationResponse)
def update_site_responsible(
    responsible_id: int,
    payload: BusinessSiteResponsibleUpdateRequest,
    current_user=Depends(require_business_core_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> BusinessSiteResponsibleMutationResponse:
    try:
        item = site_responsible_service.update_responsible(tenant_db, responsible_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return BusinessSiteResponsibleMutationResponse(
        success=True,
        message="Responsable de sitio actualizado correctamente",
        requested_by=build_business_core_requested_by(current_user),
        data=_build_item(tenant_db, item),
    )


@router.delete("/{responsible_id}", response_model=BusinessSiteResponsibleMutationResponse)
def delete_site_responsible(
    responsible_id: int,
    current_user=Depends(require_business_core_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> BusinessSiteResponsibleMutationResponse:
    try:
        item = site_responsible_service.delete_responsible(tenant_db, responsible_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return BusinessSiteResponsibleMutationResponse(
        success=True,
        message="Responsable de sitio eliminado correctamente",
        requested_by=build_business_core_requested_by(current_user),
        data=_build_item(tenant_db, item),
    )
