from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.apps.tenant_modules.products.api.serializers import build_product_catalog_item
from app.apps.tenant_modules.products.dependencies import (
    build_products_requested_by,
    require_products_manage,
    require_products_read,
)
from app.apps.tenant_modules.products.schemas import (
    ProductCatalogMutationResponse,
    ProductCatalogProductsResponse,
    ProductCatalogProductCreateRequest,
    ProductCatalogProductUpdateRequest,
    ProductCatalogStatusUpdateRequest,
)
from app.apps.tenant_modules.products.services import ProductCatalogService
from app.apps.tenant_modules.products.services import ProductSourceService
from app.common.db.session_manager import get_tenant_db

router = APIRouter(prefix="/tenant/products/catalog", tags=["Tenant Products"])
service = ProductCatalogService()
source_service = ProductSourceService()


@router.get("", response_model=ProductCatalogProductsResponse)
def list_product_catalog_items(
    include_inactive: bool = True,
    product_type: str | None = None,
    q: str | None = None,
    current_user=Depends(require_products_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> ProductCatalogProductsResponse:
    rows = service.list_products(
        tenant_db,
        include_inactive=include_inactive,
        product_type=product_type,
        q=q,
    )
    characteristic_map = service.get_characteristics_map(tenant_db, [item.id for item in rows])
    health_map = source_service.build_product_health_map(tenant_db, [item.id for item in rows])
    return ProductCatalogProductsResponse(
        success=True,
        message="Catálogo recuperado correctamente",
        requested_by=build_products_requested_by(current_user),
        total=len(rows),
        data=[
            build_product_catalog_item(
                item,
                characteristics=characteristic_map.get(item.id, []),
                health=health_map.get(item.id),
            )
            for item in rows
        ],
    )


@router.post("", response_model=ProductCatalogMutationResponse)
def create_product_catalog_item(
    payload: ProductCatalogProductCreateRequest,
    current_user=Depends(require_products_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> ProductCatalogMutationResponse:
    try:
        item = service.create_product(tenant_db, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    characteristic_map = service.get_characteristics_map(tenant_db, [item.id])
    health_map = source_service.build_product_health_map(tenant_db, [item.id])
    return ProductCatalogMutationResponse(
        success=True,
        message="Producto creado correctamente",
        requested_by=build_products_requested_by(current_user),
        data=build_product_catalog_item(
            item,
            characteristics=characteristic_map.get(item.id, []),
            health=health_map.get(item.id),
        ),
    )


@router.get("/{product_id}", response_model=ProductCatalogMutationResponse)
def get_product_catalog_item(
    product_id: int,
    current_user=Depends(require_products_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> ProductCatalogMutationResponse:
    try:
        item = service.get_product(tenant_db, product_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    characteristic_map = service.get_characteristics_map(tenant_db, [item.id])
    health_map = source_service.build_product_health_map(tenant_db, [item.id])
    return ProductCatalogMutationResponse(
        success=True,
        message="Producto recuperado correctamente",
        requested_by=build_products_requested_by(current_user),
        data=build_product_catalog_item(
            item,
            characteristics=characteristic_map.get(item.id, []),
            health=health_map.get(item.id),
        ),
    )


@router.put("/{product_id}", response_model=ProductCatalogMutationResponse)
def update_product_catalog_item(
    product_id: int,
    payload: ProductCatalogProductUpdateRequest,
    current_user=Depends(require_products_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> ProductCatalogMutationResponse:
    try:
        item = service.update_product(tenant_db, product_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    characteristic_map = service.get_characteristics_map(tenant_db, [item.id])
    health_map = source_service.build_product_health_map(tenant_db, [item.id])
    return ProductCatalogMutationResponse(
        success=True,
        message="Producto actualizado correctamente",
        requested_by=build_products_requested_by(current_user),
        data=build_product_catalog_item(
            item,
            characteristics=characteristic_map.get(item.id, []),
            health=health_map.get(item.id),
        ),
    )


@router.patch("/{product_id}/status", response_model=ProductCatalogMutationResponse)
def update_product_catalog_item_status(
    product_id: int,
    payload: ProductCatalogStatusUpdateRequest,
    current_user=Depends(require_products_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> ProductCatalogMutationResponse:
    try:
        item = service.set_product_active(tenant_db, product_id, payload.is_active)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    characteristic_map = service.get_characteristics_map(tenant_db, [item.id])
    health_map = source_service.build_product_health_map(tenant_db, [item.id])
    return ProductCatalogMutationResponse(
        success=True,
        message="Estado del producto actualizado correctamente",
        requested_by=build_products_requested_by(current_user),
        data=build_product_catalog_item(
            item,
            characteristics=characteristic_map.get(item.id, []),
            health=health_map.get(item.id),
        ),
    )


@router.delete("/{product_id}", response_model=ProductCatalogMutationResponse)
def delete_product_catalog_item(
    product_id: int,
    current_user=Depends(require_products_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> ProductCatalogMutationResponse:
    try:
        item = service.delete_product(tenant_db, product_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return ProductCatalogMutationResponse(
        success=True,
        message="Producto eliminado correctamente",
        requested_by=build_products_requested_by(current_user),
        data=build_product_catalog_item(item, characteristics=[], health=None),
    )
