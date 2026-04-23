from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.apps.tenant_modules.crm.api.serializers import build_quote_item
from app.apps.tenant_modules.crm.dependencies import (
    build_crm_requested_by,
    require_crm_manage,
    require_crm_read,
)
from app.apps.tenant_modules.crm.schemas import (
    CRMQuoteCreateRequest,
    CRMQuoteMutationResponse,
    CRMQuotesResponse,
    CRMQuoteUpdateRequest,
    CRMStatusUpdateRequest,
)
from app.apps.tenant_modules.crm.services import CRMQuoteService
from app.common.db.session_manager import get_tenant_db

router = APIRouter(prefix="/tenant/crm/quotes", tags=["Tenant CRM"])
service = CRMQuoteService()


def _serialize_quotes(tenant_db, rows):
    client_display_map = service.get_client_display_map(
        tenant_db,
        [item.client_id for item in rows if item.client_id],
    )
    opportunity_title_map = service.get_opportunity_title_map(
        tenant_db,
        [item.opportunity_id for item in rows if item.opportunity_id],
    )
    template_name_map = service.get_template_name_map(
        tenant_db,
        [item.template_id for item in rows if item.template_id],
    )
    line_map = service.get_quote_lines(tenant_db, [item.id for item in rows])
    section_map = service.get_quote_sections(tenant_db, [item.id for item in rows])
    section_ids = [
        section.id
        for sections in section_map.values()
        for section in sections
    ]
    section_line_map = service.get_section_lines(tenant_db, section_ids)
    product_ids = [
        line.product_id
        for lines in line_map.values()
        for line in lines
        if line.product_id
    ] + [
        line.product_id
        for lines in section_line_map.values()
        for line in lines
        if line.product_id
    ]
    product_name_map = service.get_product_name_map(tenant_db, product_ids)
    return [
        build_quote_item(
            item,
            client_display_name=client_display_map.get(item.client_id),
            opportunity_title=opportunity_title_map.get(item.opportunity_id),
            template_name=template_name_map.get(item.template_id),
            lines=line_map.get(item.id, []),
            sections=section_map.get(item.id, []),
            section_lines_map=section_line_map,
            product_name_map=product_name_map,
        )
        for item in rows
    ]


@router.get("", response_model=CRMQuotesResponse)
def list_crm_quotes(
    include_inactive: bool = True,
    quote_status: str | None = None,
    client_id: int | None = None,
    q: str | None = None,
    current_user=Depends(require_crm_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> CRMQuotesResponse:
    rows = service.list_quotes(
        tenant_db,
        include_inactive=include_inactive,
        quote_status=quote_status,
        client_id=client_id,
        q=q,
    )
    return CRMQuotesResponse(
        success=True,
        message="Cotizaciones recuperadas correctamente",
        requested_by=build_crm_requested_by(current_user),
        total=len(rows),
        quoted_amount=round(sum(float(item.total_amount or 0) for item in rows if item.is_active), 2),
        data=_serialize_quotes(tenant_db, rows),
    )


@router.post("", response_model=CRMQuoteMutationResponse)
def create_crm_quote(
    payload: CRMQuoteCreateRequest,
    current_user=Depends(require_crm_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> CRMQuoteMutationResponse:
    try:
        item = service.create_quote(tenant_db, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    serialized = _serialize_quotes(tenant_db, [item])[0]
    return CRMQuoteMutationResponse(
        success=True,
        message="Cotizacion creada correctamente",
        requested_by=build_crm_requested_by(current_user),
        data=serialized,
    )


@router.get("/{quote_id}", response_model=CRMQuoteMutationResponse)
def get_crm_quote(
    quote_id: int,
    current_user=Depends(require_crm_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> CRMQuoteMutationResponse:
    try:
        item = service.get_quote(tenant_db, quote_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    serialized = _serialize_quotes(tenant_db, [item])[0]
    return CRMQuoteMutationResponse(
        success=True,
        message="Cotizacion recuperada correctamente",
        requested_by=build_crm_requested_by(current_user),
        data=serialized,
    )


@router.put("/{quote_id}", response_model=CRMQuoteMutationResponse)
def update_crm_quote(
    quote_id: int,
    payload: CRMQuoteUpdateRequest,
    current_user=Depends(require_crm_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> CRMQuoteMutationResponse:
    try:
        item = service.update_quote(tenant_db, quote_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    serialized = _serialize_quotes(tenant_db, [item])[0]
    return CRMQuoteMutationResponse(
        success=True,
        message="Cotizacion actualizada correctamente",
        requested_by=build_crm_requested_by(current_user),
        data=serialized,
    )


@router.patch("/{quote_id}/status", response_model=CRMQuoteMutationResponse)
def update_crm_quote_status(
    quote_id: int,
    payload: CRMStatusUpdateRequest,
    current_user=Depends(require_crm_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> CRMQuoteMutationResponse:
    try:
        item = service.set_quote_active(tenant_db, quote_id, payload.is_active)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    serialized = _serialize_quotes(tenant_db, [item])[0]
    return CRMQuoteMutationResponse(
        success=True,
        message="Estado de cotizacion actualizado correctamente",
        requested_by=build_crm_requested_by(current_user),
        data=serialized,
    )


@router.delete("/{quote_id}", response_model=CRMQuoteMutationResponse)
def delete_crm_quote(
    quote_id: int,
    current_user=Depends(require_crm_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> CRMQuoteMutationResponse:
    try:
        item = service.delete_quote(tenant_db, quote_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return CRMQuoteMutationResponse(
        success=True,
        message="Cotizacion eliminada correctamente",
        requested_by=build_crm_requested_by(current_user),
        data=build_quote_item(item),
    )
