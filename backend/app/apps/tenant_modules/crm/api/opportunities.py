from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.apps.tenant_modules.crm.dependencies import (
    build_crm_requested_by,
    require_crm_manage,
    require_crm_read,
)
from app.apps.tenant_modules.crm.schemas import (
    CRMOpportunitiesResponse,
    CRMOpportunityCreateRequest,
    CRMOpportunityItemResponse,
    CRMOpportunityMutationResponse,
    CRMOpportunityUpdateRequest,
    CRMStatusUpdateRequest,
)
from app.apps.tenant_modules.crm.services import CRMOpportunityService
from app.common.db.session_manager import get_tenant_db

router = APIRouter(prefix="/tenant/crm/opportunities", tags=["Tenant CRM"])
service = CRMOpportunityService()


def _build_item(item, *, client_display_name: str | None = None) -> CRMOpportunityItemResponse:
    return CRMOpportunityItemResponse(
        id=item.id,
        client_id=item.client_id,
        client_display_name=client_display_name,
        title=item.title,
        stage=item.stage,
        owner_user_id=item.owner_user_id,
        expected_value=item.expected_value,
        probability_percent=item.probability_percent,
        expected_close_at=item.expected_close_at,
        source_channel=item.source_channel,
        summary=item.summary,
        next_step=item.next_step,
        is_active=item.is_active,
        sort_order=item.sort_order,
        created_at=item.created_at,
        updated_at=item.updated_at,
    )


@router.get("", response_model=CRMOpportunitiesResponse)
def list_crm_opportunities(
    include_inactive: bool = True,
    stage: str | None = None,
    client_id: int | None = None,
    q: str | None = None,
    current_user=Depends(require_crm_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> CRMOpportunitiesResponse:
    rows = service.list_opportunities(
        tenant_db,
        include_inactive=include_inactive,
        stage=stage,
        client_id=client_id,
        q=q,
    )
    client_display_map = service.get_client_display_map(
        tenant_db,
        [item.client_id for item in rows if item.client_id],
    )
    return CRMOpportunitiesResponse(
        success=True,
        message="Oportunidades recuperadas correctamente",
        requested_by=build_crm_requested_by(current_user),
        total=len(rows),
        pipeline_value=round(
            sum(float(item.expected_value or 0) for item in rows if item.is_active),
            2,
        ),
        data=[
            _build_item(item, client_display_name=client_display_map.get(item.client_id))
            for item in rows
        ],
    )


@router.post("", response_model=CRMOpportunityMutationResponse)
def create_crm_opportunity(
    payload: CRMOpportunityCreateRequest,
    current_user=Depends(require_crm_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> CRMOpportunityMutationResponse:
    try:
        item = service.create_opportunity(tenant_db, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    client_display_map = service.get_client_display_map(
        tenant_db,
        [item.client_id] if item.client_id else [],
    )
    return CRMOpportunityMutationResponse(
        success=True,
        message="Oportunidad creada correctamente",
        requested_by=build_crm_requested_by(current_user),
        data=_build_item(item, client_display_name=client_display_map.get(item.client_id)),
    )


@router.get("/{opportunity_id}", response_model=CRMOpportunityMutationResponse)
def get_crm_opportunity(
    opportunity_id: int,
    current_user=Depends(require_crm_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> CRMOpportunityMutationResponse:
    try:
        item = service.get_opportunity(tenant_db, opportunity_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    client_display_map = service.get_client_display_map(
        tenant_db,
        [item.client_id] if item.client_id else [],
    )
    return CRMOpportunityMutationResponse(
        success=True,
        message="Oportunidad recuperada correctamente",
        requested_by=build_crm_requested_by(current_user),
        data=_build_item(item, client_display_name=client_display_map.get(item.client_id)),
    )


@router.put("/{opportunity_id}", response_model=CRMOpportunityMutationResponse)
def update_crm_opportunity(
    opportunity_id: int,
    payload: CRMOpportunityUpdateRequest,
    current_user=Depends(require_crm_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> CRMOpportunityMutationResponse:
    try:
        item = service.update_opportunity(tenant_db, opportunity_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    client_display_map = service.get_client_display_map(
        tenant_db,
        [item.client_id] if item.client_id else [],
    )
    return CRMOpportunityMutationResponse(
        success=True,
        message="Oportunidad actualizada correctamente",
        requested_by=build_crm_requested_by(current_user),
        data=_build_item(item, client_display_name=client_display_map.get(item.client_id)),
    )


@router.patch("/{opportunity_id}/status", response_model=CRMOpportunityMutationResponse)
def update_crm_opportunity_status(
    opportunity_id: int,
    payload: CRMStatusUpdateRequest,
    current_user=Depends(require_crm_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> CRMOpportunityMutationResponse:
    try:
        item = service.set_opportunity_active(tenant_db, opportunity_id, payload.is_active)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    client_display_map = service.get_client_display_map(
        tenant_db,
        [item.client_id] if item.client_id else [],
    )
    return CRMOpportunityMutationResponse(
        success=True,
        message="Estado de la oportunidad actualizado correctamente",
        requested_by=build_crm_requested_by(current_user),
        data=_build_item(item, client_display_name=client_display_map.get(item.client_id)),
    )


@router.delete("/{opportunity_id}", response_model=CRMOpportunityMutationResponse)
def delete_crm_opportunity(
    opportunity_id: int,
    current_user=Depends(require_crm_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> CRMOpportunityMutationResponse:
    try:
        item = service.delete_opportunity(tenant_db, opportunity_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return CRMOpportunityMutationResponse(
        success=True,
        message="Oportunidad eliminada correctamente",
        requested_by=build_crm_requested_by(current_user),
        data=_build_item(item),
    )
