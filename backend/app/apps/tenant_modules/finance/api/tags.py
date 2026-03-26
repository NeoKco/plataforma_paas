from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.apps.tenant_modules.finance.dependencies import (
    build_finance_requested_by,
    require_finance_manage,
    require_finance_read,
)
from app.apps.tenant_modules.finance.schemas import (
    FinanceStatusUpdateRequest,
    FinanceTagCreateRequest,
    FinanceTagItemResponse,
    FinanceTagMutationResponse,
    FinanceTagsResponse,
    FinanceTagUpdateRequest,
)
from app.apps.tenant_modules.finance.services import FinanceTagService
from app.common.db.session_manager import get_tenant_db

router = APIRouter(prefix="/tenant/finance/tags", tags=["Tenant Finance"])
tag_service = FinanceTagService()


def _build_tag_item(tag) -> FinanceTagItemResponse:
    return FinanceTagItemResponse(
        id=tag.id,
        name=tag.name,
        color=tag.color,
        is_active=tag.is_active,
        sort_order=tag.sort_order,
        created_at=tag.created_at,
        updated_at=tag.updated_at,
    )


@router.get("", response_model=FinanceTagsResponse)
def list_finance_tags(
    include_inactive: bool = True,
    current_user=Depends(require_finance_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> FinanceTagsResponse:
    tags = tag_service.list_tags(tenant_db, include_inactive=include_inactive)
    return FinanceTagsResponse(
        success=True,
        message="Etiquetas recuperadas correctamente",
        requested_by=build_finance_requested_by(current_user),
        total=len(tags),
        data=[_build_tag_item(item) for item in tags],
    )


@router.post("", response_model=FinanceTagMutationResponse)
def create_finance_tag(
    payload: FinanceTagCreateRequest,
    current_user=Depends(require_finance_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> FinanceTagMutationResponse:
    try:
        tag = tag_service.create_tag(tenant_db, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return FinanceTagMutationResponse(
        success=True,
        message="Etiqueta creada correctamente",
        requested_by=build_finance_requested_by(current_user),
        data=_build_tag_item(tag),
    )


@router.put("/{tag_id}", response_model=FinanceTagMutationResponse)
def update_finance_tag(
    tag_id: int,
    payload: FinanceTagUpdateRequest,
    current_user=Depends(require_finance_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> FinanceTagMutationResponse:
    try:
        tag = tag_service.update_tag(tenant_db, tag_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return FinanceTagMutationResponse(
        success=True,
        message="Etiqueta actualizada correctamente",
        requested_by=build_finance_requested_by(current_user),
        data=_build_tag_item(tag),
    )


@router.patch("/{tag_id}/status", response_model=FinanceTagMutationResponse)
def update_finance_tag_status(
    tag_id: int,
    payload: FinanceStatusUpdateRequest,
    current_user=Depends(require_finance_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> FinanceTagMutationResponse:
    try:
        tag = tag_service.set_tag_active(tenant_db, tag_id, payload.is_active)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return FinanceTagMutationResponse(
        success=True,
        message="Estado de la etiqueta actualizado correctamente",
        requested_by=build_finance_requested_by(current_user),
        data=_build_tag_item(tag),
    )
