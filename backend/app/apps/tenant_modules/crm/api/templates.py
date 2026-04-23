from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.apps.tenant_modules.crm.api.serializers import build_template_envelope
from app.apps.tenant_modules.crm.dependencies import (
    build_crm_requested_by,
    require_crm_manage,
    require_crm_read,
)
from app.apps.tenant_modules.crm.schemas import (
    CRMQuoteTemplateCreateRequest,
    CRMQuoteTemplateMutationResponse,
    CRMQuoteTemplatesResponse,
    CRMQuoteTemplateUpdateRequest,
    CRMStatusUpdateRequest,
)
from app.apps.tenant_modules.crm.services import CRMQuoteTemplateService
from app.common.db.session_manager import get_tenant_db

router = APIRouter(prefix="/tenant/crm/templates", tags=["Tenant CRM"])
service = CRMQuoteTemplateService()


def _serialize_templates(tenant_db, rows):
    section_map = service.get_sections_map(tenant_db, [item.id for item in rows])
    section_ids = [
        section.id
        for sections in section_map.values()
        for section in sections
    ]
    section_items_map = service.get_items_map(tenant_db, section_ids)
    product_ids = [
        item.product_id
        for items in section_items_map.values()
        for item in items
        if item.product_id
    ]
    product_name_map = service.get_product_name_map(tenant_db, product_ids)
    return [
        build_template_envelope(
            item,
            sections=section_map.get(item.id, []),
            section_items_map=section_items_map,
            product_name_map=product_name_map,
        )
        for item in rows
    ]


@router.get("", response_model=CRMQuoteTemplatesResponse)
def list_crm_quote_templates(
    include_inactive: bool = True,
    current_user=Depends(require_crm_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> CRMQuoteTemplatesResponse:
    rows = service.list_templates(tenant_db, include_inactive=include_inactive)
    return CRMQuoteTemplatesResponse(
        success=True,
        message="Plantillas comerciales recuperadas correctamente",
        requested_by=build_crm_requested_by(current_user),
        total=len(rows),
        data=_serialize_templates(tenant_db, rows),
    )


@router.post("", response_model=CRMQuoteTemplateMutationResponse)
def create_crm_quote_template(
    payload: CRMQuoteTemplateCreateRequest,
    current_user=Depends(require_crm_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> CRMQuoteTemplateMutationResponse:
    try:
        item = service.create_template(tenant_db, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    serialized = _serialize_templates(tenant_db, [item])[0]
    return CRMQuoteTemplateMutationResponse(
        success=True,
        message="Plantilla comercial creada correctamente",
        requested_by=build_crm_requested_by(current_user),
        data=serialized,
    )


@router.get("/{template_id}", response_model=CRMQuoteTemplateMutationResponse)
def get_crm_quote_template(
    template_id: int,
    current_user=Depends(require_crm_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> CRMQuoteTemplateMutationResponse:
    try:
        item = service.get_template(tenant_db, template_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    serialized = _serialize_templates(tenant_db, [item])[0]
    return CRMQuoteTemplateMutationResponse(
        success=True,
        message="Plantilla comercial recuperada correctamente",
        requested_by=build_crm_requested_by(current_user),
        data=serialized,
    )


@router.put("/{template_id}", response_model=CRMQuoteTemplateMutationResponse)
def update_crm_quote_template(
    template_id: int,
    payload: CRMQuoteTemplateUpdateRequest,
    current_user=Depends(require_crm_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> CRMQuoteTemplateMutationResponse:
    try:
        item = service.update_template(tenant_db, template_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    serialized = _serialize_templates(tenant_db, [item])[0]
    return CRMQuoteTemplateMutationResponse(
        success=True,
        message="Plantilla comercial actualizada correctamente",
        requested_by=build_crm_requested_by(current_user),
        data=serialized,
    )


@router.patch("/{template_id}/status", response_model=CRMQuoteTemplateMutationResponse)
def update_crm_quote_template_status(
    template_id: int,
    payload: CRMStatusUpdateRequest,
    current_user=Depends(require_crm_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> CRMQuoteTemplateMutationResponse:
    try:
        item = service.set_template_active(tenant_db, template_id, payload.is_active)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    serialized = _serialize_templates(tenant_db, [item])[0]
    return CRMQuoteTemplateMutationResponse(
        success=True,
        message="Estado de plantilla comercial actualizado correctamente",
        requested_by=build_crm_requested_by(current_user),
        data=serialized,
    )


@router.delete("/{template_id}", response_model=CRMQuoteTemplateMutationResponse)
def delete_crm_quote_template(
    template_id: int,
    current_user=Depends(require_crm_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> CRMQuoteTemplateMutationResponse:
    try:
        item = service.delete_template(tenant_db, template_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return CRMQuoteTemplateMutationResponse(
        success=True,
        message="Plantilla comercial eliminada correctamente",
        requested_by=build_crm_requested_by(current_user),
        data=build_template_envelope(item),
    )
