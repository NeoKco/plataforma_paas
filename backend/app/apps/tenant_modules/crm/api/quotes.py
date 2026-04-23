from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.apps.tenant_modules.crm.dependencies import (
    build_crm_requested_by,
    require_crm_manage,
    require_crm_read,
)
from app.apps.tenant_modules.crm.schemas import (
    CRMQuoteCreateRequest,
    CRMQuoteItemResponse,
    CRMQuoteMutationResponse,
    CRMQuotesResponse,
    CRMQuoteUpdateRequest,
    CRMStatusUpdateRequest,
)
from app.apps.tenant_modules.crm.services import CRMQuoteService
from app.common.db.session_manager import get_tenant_db

router = APIRouter(prefix="/tenant/crm/quotes", tags=["Tenant CRM"])
service = CRMQuoteService()


def _build_item(
    item,
    *,
    client_display_name: str | None = None,
    opportunity_title: str | None = None,
    lines_map: dict | None = None,
    product_name_map: dict | None = None,
) -> CRMQuoteItemResponse:
    lines = []
    for line in (lines_map or {}).get(item.id, []):
        lines.append(
            {
                **line.__dict__,
                "product_name": None if product_name_map is None else product_name_map.get(line.product_id),
            }
        )
    return CRMQuoteItemResponse(
        id=item.id,
        client_id=item.client_id,
        client_display_name=client_display_name,
        opportunity_id=item.opportunity_id,
        opportunity_title=opportunity_title,
        quote_number=item.quote_number,
        title=item.title,
        quote_status=item.quote_status,
        valid_until=item.valid_until,
        subtotal_amount=item.subtotal_amount,
        discount_amount=item.discount_amount,
        tax_amount=item.tax_amount,
        total_amount=item.total_amount,
        summary=item.summary,
        notes=item.notes,
        is_active=item.is_active,
        sort_order=item.sort_order,
        created_at=item.created_at,
        updated_at=item.updated_at,
        lines=lines,
    )


def _build_context(tenant_db: Session, rows) -> tuple[dict[int, str], dict[int, str], dict[int, list], dict[int, str]]:
    client_display_map = service.get_client_display_map(
        tenant_db,
        [item.client_id for item in rows if item.client_id],
    )
    opportunity_title_map = service.get_opportunity_title_map(
        tenant_db,
        [item.opportunity_id for item in rows if item.opportunity_id],
    )
    lines_map = service.get_quote_lines(tenant_db, [item.id for item in rows])
    product_name_map = service.get_product_name_map(
        tenant_db,
        [
            line.product_id
            for lines in lines_map.values()
            for line in lines
            if line.product_id
        ],
    )
    return client_display_map, opportunity_title_map, lines_map, product_name_map


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
    client_display_map, opportunity_title_map, lines_map, product_name_map = _build_context(
        tenant_db,
        rows,
    )
    return CRMQuotesResponse(
        success=True,
        message="Cotizaciones recuperadas correctamente",
        requested_by=build_crm_requested_by(current_user),
        total=len(rows),
        quoted_amount=round(sum(float(item.total_amount or 0) for item in rows if item.is_active), 2),
        data=[
            _build_item(
                item,
                client_display_name=client_display_map.get(item.client_id),
                opportunity_title=opportunity_title_map.get(item.opportunity_id),
                lines_map=lines_map,
                product_name_map=product_name_map,
            )
            for item in rows
        ],
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
    client_display_map, opportunity_title_map, lines_map, product_name_map = _build_context(
        tenant_db,
        [item],
    )
    return CRMQuoteMutationResponse(
        success=True,
        message="Cotizacion creada correctamente",
        requested_by=build_crm_requested_by(current_user),
        data=_build_item(
            item,
            client_display_name=client_display_map.get(item.client_id),
            opportunity_title=opportunity_title_map.get(item.opportunity_id),
            lines_map=lines_map,
            product_name_map=product_name_map,
        ),
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
    client_display_map, opportunity_title_map, lines_map, product_name_map = _build_context(
        tenant_db,
        [item],
    )
    return CRMQuoteMutationResponse(
        success=True,
        message="Cotizacion recuperada correctamente",
        requested_by=build_crm_requested_by(current_user),
        data=_build_item(
            item,
            client_display_name=client_display_map.get(item.client_id),
            opportunity_title=opportunity_title_map.get(item.opportunity_id),
            lines_map=lines_map,
            product_name_map=product_name_map,
        ),
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
    client_display_map, opportunity_title_map, lines_map, product_name_map = _build_context(
        tenant_db,
        [item],
    )
    return CRMQuoteMutationResponse(
        success=True,
        message="Cotizacion actualizada correctamente",
        requested_by=build_crm_requested_by(current_user),
        data=_build_item(
            item,
            client_display_name=client_display_map.get(item.client_id),
            opportunity_title=opportunity_title_map.get(item.opportunity_id),
            lines_map=lines_map,
            product_name_map=product_name_map,
        ),
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
    client_display_map, opportunity_title_map, lines_map, product_name_map = _build_context(
        tenant_db,
        [item],
    )
    return CRMQuoteMutationResponse(
        success=True,
        message="Estado de la cotizacion actualizado correctamente",
        requested_by=build_crm_requested_by(current_user),
        data=_build_item(
            item,
            client_display_name=client_display_map.get(item.client_id),
            opportunity_title=opportunity_title_map.get(item.opportunity_id),
            lines_map=lines_map,
            product_name_map=product_name_map,
        ),
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
        data=_build_item(item),
    )
