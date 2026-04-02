from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.apps.tenant_modules.business_core.dependencies import (
    build_business_core_requested_by,
    require_business_core_manage,
    require_business_core_read,
)
from app.apps.tenant_modules.business_core.schemas import (
    BusinessContactCreateRequest,
    BusinessContactItemResponse,
    BusinessContactMutationResponse,
    BusinessContactsResponse,
    BusinessContactUpdateRequest,
    BusinessCoreStatusUpdateRequest,
)
from app.apps.tenant_modules.business_core.services import BusinessContactService
from app.common.db.session_manager import get_tenant_db

router = APIRouter(prefix="/tenant/business-core/contacts", tags=["Tenant Business Core"])
contact_service = BusinessContactService()


def _build_contact_item(contact) -> BusinessContactItemResponse:
    return BusinessContactItemResponse(
        id=contact.id,
        organization_id=contact.organization_id,
        full_name=contact.full_name,
        email=contact.email,
        phone=contact.phone,
        role_title=contact.role_title,
        is_primary=contact.is_primary,
        is_active=contact.is_active,
        sort_order=contact.sort_order,
        created_at=contact.created_at,
        updated_at=contact.updated_at,
    )


@router.get("", response_model=BusinessContactsResponse)
def list_business_contacts(
    organization_id: int | None = None,
    include_inactive: bool = True,
    current_user=Depends(require_business_core_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> BusinessContactsResponse:
    contacts = contact_service.list_contacts(
        tenant_db,
        organization_id=organization_id,
        include_inactive=include_inactive,
    )
    return BusinessContactsResponse(
        success=True,
        message="Contactos recuperados correctamente",
        requested_by=build_business_core_requested_by(current_user),
        total=len(contacts),
        data=[_build_contact_item(contact) for contact in contacts],
    )


@router.post("", response_model=BusinessContactMutationResponse)
def create_business_contact(
    payload: BusinessContactCreateRequest,
    current_user=Depends(require_business_core_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> BusinessContactMutationResponse:
    try:
        contact = contact_service.create_contact(tenant_db, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return BusinessContactMutationResponse(
        success=True,
        message="Contacto creado correctamente",
        requested_by=build_business_core_requested_by(current_user),
        data=_build_contact_item(contact),
    )


@router.get("/{contact_id}", response_model=BusinessContactMutationResponse)
def get_business_contact(
    contact_id: int,
    current_user=Depends(require_business_core_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> BusinessContactMutationResponse:
    try:
        contact = contact_service.get_contact(tenant_db, contact_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    return BusinessContactMutationResponse(
        success=True,
        message="Contacto recuperado correctamente",
        requested_by=build_business_core_requested_by(current_user),
        data=_build_contact_item(contact),
    )


@router.put("/{contact_id}", response_model=BusinessContactMutationResponse)
def update_business_contact(
    contact_id: int,
    payload: BusinessContactUpdateRequest,
    current_user=Depends(require_business_core_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> BusinessContactMutationResponse:
    try:
        contact = contact_service.update_contact(tenant_db, contact_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return BusinessContactMutationResponse(
        success=True,
        message="Contacto actualizado correctamente",
        requested_by=build_business_core_requested_by(current_user),
        data=_build_contact_item(contact),
    )


@router.patch("/{contact_id}/status", response_model=BusinessContactMutationResponse)
def update_business_contact_status(
    contact_id: int,
    payload: BusinessCoreStatusUpdateRequest,
    current_user=Depends(require_business_core_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> BusinessContactMutationResponse:
    try:
        contact = contact_service.set_contact_active(
            tenant_db,
            contact_id,
            payload.is_active,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return BusinessContactMutationResponse(
        success=True,
        message="Estado del contacto actualizado correctamente",
        requested_by=build_business_core_requested_by(current_user),
        data=_build_contact_item(contact),
    )


@router.delete("/{contact_id}", response_model=BusinessContactMutationResponse)
def delete_business_contact(
    contact_id: int,
    current_user=Depends(require_business_core_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> BusinessContactMutationResponse:
    try:
        contact = contact_service.delete_contact(tenant_db, contact_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return BusinessContactMutationResponse(
        success=True,
        message="Contacto eliminado correctamente",
        requested_by=build_business_core_requested_by(current_user),
        data=_build_contact_item(contact),
    )
