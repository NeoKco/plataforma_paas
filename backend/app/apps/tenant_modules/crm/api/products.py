from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.apps.tenant_modules.crm.api.serializers import build_product_item
from app.apps.tenant_modules.crm.dependencies import (
    build_crm_requested_by,
    require_crm_manage,
    require_crm_read,
)
from app.apps.tenant_modules.crm.schemas import (
    CRMProductCreateRequest,
    CRMProductMutationResponse,
    CRMProductsResponse,
    CRMProductUpdateRequest,
    CRMStatusUpdateRequest,
)
from app.apps.tenant_modules.crm.services import CRMProductService
from app.common.db.session_manager import get_tenant_db

router = APIRouter(prefix="/tenant/crm/products", tags=["Tenant CRM"])
service = CRMProductService()


@router.get("", response_model=CRMProductsResponse)
def list_crm_products(
    include_inactive: bool = True,
    product_type: str | None = None,
    q: str | None = None,
    current_user=Depends(require_crm_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> CRMProductsResponse:
    rows = service.list_products(
        tenant_db,
        include_inactive=include_inactive,
        product_type=product_type,
        q=q,
    )
    characteristic_map = service.get_characteristics_map(tenant_db, [item.id for item in rows])
    return CRMProductsResponse(
        success=True,
        message="Productos recuperados correctamente",
        requested_by=build_crm_requested_by(current_user),
        total=len(rows),
        data=[
            build_product_item(item, characteristics=characteristic_map.get(item.id, []))
            for item in rows
        ],
    )


@router.post("", response_model=CRMProductMutationResponse)
def create_crm_product(
    payload: CRMProductCreateRequest,
    current_user=Depends(require_crm_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> CRMProductMutationResponse:
    try:
        item = service.create_product(tenant_db, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    characteristic_map = service.get_characteristics_map(tenant_db, [item.id])
    return CRMProductMutationResponse(
        success=True,
        message="Producto creado correctamente",
        requested_by=build_crm_requested_by(current_user),
        data=build_product_item(item, characteristics=characteristic_map.get(item.id, [])),
    )


@router.get("/{product_id}", response_model=CRMProductMutationResponse)
def get_crm_product(
    product_id: int,
    current_user=Depends(require_crm_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> CRMProductMutationResponse:
    try:
        item = service.get_product(tenant_db, product_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    characteristic_map = service.get_characteristics_map(tenant_db, [item.id])
    return CRMProductMutationResponse(
        success=True,
        message="Producto recuperado correctamente",
        requested_by=build_crm_requested_by(current_user),
        data=build_product_item(item, characteristics=characteristic_map.get(item.id, [])),
    )


@router.put("/{product_id}", response_model=CRMProductMutationResponse)
def update_crm_product(
    product_id: int,
    payload: CRMProductUpdateRequest,
    current_user=Depends(require_crm_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> CRMProductMutationResponse:
    try:
        item = service.update_product(tenant_db, product_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    characteristic_map = service.get_characteristics_map(tenant_db, [item.id])
    return CRMProductMutationResponse(
        success=True,
        message="Producto actualizado correctamente",
        requested_by=build_crm_requested_by(current_user),
        data=build_product_item(item, characteristics=characteristic_map.get(item.id, [])),
    )


@router.patch("/{product_id}/status", response_model=CRMProductMutationResponse)
def update_crm_product_status(
    product_id: int,
    payload: CRMStatusUpdateRequest,
    current_user=Depends(require_crm_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> CRMProductMutationResponse:
    try:
        item = service.set_product_active(tenant_db, product_id, payload.is_active)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    characteristic_map = service.get_characteristics_map(tenant_db, [item.id])
    return CRMProductMutationResponse(
        success=True,
        message="Estado del producto actualizado correctamente",
        requested_by=build_crm_requested_by(current_user),
        data=build_product_item(item, characteristics=characteristic_map.get(item.id, [])),
    )


@router.delete("/{product_id}", response_model=CRMProductMutationResponse)
def delete_crm_product(
    product_id: int,
    current_user=Depends(require_crm_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> CRMProductMutationResponse:
    try:
        item = service.delete_product(tenant_db, product_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return CRMProductMutationResponse(
        success=True,
        message="Producto eliminado correctamente",
        requested_by=build_crm_requested_by(current_user),
        data=build_product_item(item, characteristics=[]),
    )
