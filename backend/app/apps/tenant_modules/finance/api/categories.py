from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.apps.tenant_modules.finance.dependencies import (
    build_finance_requested_by,
    require_finance_manage,
    require_finance_read,
)
from app.apps.tenant_modules.finance.schemas import (
    FinanceCategoriesResponse,
    FinanceCategoryCreateRequest,
    FinanceCategoryItemResponse,
    FinanceCategoryMutationResponse,
    FinanceReorderRequest,
    FinanceCategoryUpdateRequest,
    FinanceStatusUpdateRequest,
)
from app.apps.tenant_modules.finance.services import FinanceCategoryService
from app.common.db.session_manager import get_tenant_db

router = APIRouter(prefix="/tenant/finance/categories", tags=["Tenant Finance"])
category_service = FinanceCategoryService()


def _build_category_item(category) -> FinanceCategoryItemResponse:
    return FinanceCategoryItemResponse(
        id=category.id,
        name=category.name,
        category_type=category.category_type,
        parent_category_id=category.parent_category_id,
        icon=category.icon,
        color=category.color,
        note=category.note,
        is_active=category.is_active,
        sort_order=category.sort_order,
        created_at=category.created_at,
        updated_at=category.updated_at,
    )


@router.get("", response_model=FinanceCategoriesResponse)
def list_finance_categories(
    category_type: str | None = None,
    include_inactive: bool = True,
    current_user=Depends(require_finance_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> FinanceCategoriesResponse:
    categories = category_service.list_categories(
        tenant_db,
        category_type=category_type,
        include_inactive=include_inactive,
    )
    return FinanceCategoriesResponse(
        success=True,
        message="Categorias financieras recuperadas correctamente",
        requested_by=build_finance_requested_by(current_user),
        total=len(categories),
        data=[_build_category_item(category) for category in categories],
    )


@router.post("", response_model=FinanceCategoryMutationResponse)
def create_finance_category(
    payload: FinanceCategoryCreateRequest,
    current_user=Depends(require_finance_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> FinanceCategoryMutationResponse:
    try:
        category = category_service.create_category(tenant_db, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return FinanceCategoryMutationResponse(
        success=True,
        message="Categoria financiera creada correctamente",
        requested_by=build_finance_requested_by(current_user),
        data=_build_category_item(category),
    )


@router.get("/{category_id}", response_model=FinanceCategoryMutationResponse)
def get_finance_category(
    category_id: int,
    current_user=Depends(require_finance_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> FinanceCategoryMutationResponse:
    try:
        category = category_service.get_category(tenant_db, category_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    return FinanceCategoryMutationResponse(
        success=True,
        message="Categoria financiera recuperada correctamente",
        requested_by=build_finance_requested_by(current_user),
        data=_build_category_item(category),
    )


@router.put("/{category_id}", response_model=FinanceCategoryMutationResponse)
def update_finance_category(
    category_id: int,
    payload: FinanceCategoryUpdateRequest,
    current_user=Depends(require_finance_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> FinanceCategoryMutationResponse:
    try:
        category = category_service.update_category(tenant_db, category_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return FinanceCategoryMutationResponse(
        success=True,
        message="Categoria financiera actualizada correctamente",
        requested_by=build_finance_requested_by(current_user),
        data=_build_category_item(category),
    )


@router.patch("/{category_id}/status", response_model=FinanceCategoryMutationResponse)
def update_finance_category_status(
    category_id: int,
    payload: FinanceStatusUpdateRequest,
    current_user=Depends(require_finance_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> FinanceCategoryMutationResponse:
    try:
        category = category_service.set_category_active(
            tenant_db,
            category_id,
            payload.is_active,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return FinanceCategoryMutationResponse(
        success=True,
        message="Estado de la categoria financiera actualizado correctamente",
        requested_by=build_finance_requested_by(current_user),
        data=_build_category_item(category),
    )


@router.delete("/{category_id}", response_model=FinanceCategoryMutationResponse)
def delete_finance_category(
    category_id: int,
    current_user=Depends(require_finance_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> FinanceCategoryMutationResponse:
    try:
        category = category_service.delete_category(tenant_db, category_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return FinanceCategoryMutationResponse(
        success=True,
        message="Categoria financiera eliminada correctamente",
        requested_by=build_finance_requested_by(current_user),
        data=_build_category_item(category),
    )


@router.patch("/reorder", response_model=FinanceCategoriesResponse)
def reorder_finance_categories(
    payload: FinanceReorderRequest,
    current_user=Depends(require_finance_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> FinanceCategoriesResponse:
    try:
        categories = category_service.reorder_categories(
            tenant_db,
            [(item.id, item.sort_order) for item in payload.items],
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return FinanceCategoriesResponse(
        success=True,
        message="Orden de categorias financieras actualizado correctamente",
        requested_by=build_finance_requested_by(current_user),
        total=len(categories),
        data=[_build_category_item(category) for category in categories],
    )
