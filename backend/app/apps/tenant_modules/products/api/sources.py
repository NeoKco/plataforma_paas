from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.apps.tenant_modules.products.api.serializers import (
    build_product_price_history_item,
    build_product_source_item,
)
from app.apps.tenant_modules.products.dependencies import (
    build_products_requested_by,
    require_products_manage,
    require_products_read,
)
from app.apps.tenant_modules.products.schemas import (
    ProductCatalogPriceHistoryCreateRequest,
    ProductCatalogPriceHistoryResponse,
    ProductCatalogProductSourceCreateRequest,
    ProductCatalogProductSourceUpdateRequest,
    ProductCatalogSourceMutationResponse,
    ProductCatalogSourcesResponse,
)
from app.apps.tenant_modules.products.services import ProductSourceService
from app.common.db.session_manager import get_tenant_db

router = APIRouter(prefix="/tenant/products", tags=["Tenant Products"])
service = ProductSourceService()


def _serialize_sources(tenant_db: Session, rows: list):
    connector_ids = [item.connector_id for item in rows if item.connector_id]
    connector_map, _ = service.build_maps(tenant_db, connector_ids=connector_ids)
    return [
        build_product_source_item(item, connector_name=connector_map.get(item.connector_id))
        for item in rows
    ]


def _serialize_prices(tenant_db: Session, rows: list):
    connector_ids = [item.connector_id for item in rows if item.connector_id]
    product_ids = [item.product_id for item in rows if item.product_id]
    connector_map, product_map = service.build_maps(
        tenant_db,
        connector_ids=connector_ids,
        product_ids=product_ids,
    )
    return [
        build_product_price_history_item(
            item,
            product_name=product_map.get(item.product_id),
            connector_name=connector_map.get(item.connector_id),
        )
        for item in rows
    ]


@router.get("/sources", response_model=ProductCatalogSourcesResponse)
def list_product_sources(
    product_id: int | None = None,
    connector_id: int | None = None,
    source_status: str | None = None,
    current_user=Depends(require_products_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> ProductCatalogSourcesResponse:
    rows = service.list_sources(
        tenant_db,
        product_id=product_id,
        connector_id=connector_id,
        source_status=source_status,
    )
    return ProductCatalogSourcesResponse(
        success=True,
        message="Fuentes recuperadas correctamente",
        requested_by=build_products_requested_by(current_user),
        total=len(rows),
        data=_serialize_sources(tenant_db, rows),
    )


@router.post("/catalog/{product_id}/sources", response_model=ProductCatalogSourceMutationResponse)
def create_product_source(
    product_id: int,
    payload: ProductCatalogProductSourceCreateRequest,
    current_user=Depends(require_products_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> ProductCatalogSourceMutationResponse:
    try:
        item = service.create_source(tenant_db, product_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return ProductCatalogSourceMutationResponse(
        success=True,
        message="Fuente agregada correctamente",
        requested_by=build_products_requested_by(current_user),
        data=_serialize_sources(tenant_db, [item])[0],
    )


@router.put("/sources/{source_id}", response_model=ProductCatalogSourceMutationResponse)
def update_product_source(
    source_id: int,
    payload: ProductCatalogProductSourceUpdateRequest,
    current_user=Depends(require_products_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> ProductCatalogSourceMutationResponse:
    try:
        item = service.update_source(tenant_db, source_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return ProductCatalogSourceMutationResponse(
        success=True,
        message="Fuente actualizada correctamente",
        requested_by=build_products_requested_by(current_user),
        data=_serialize_sources(tenant_db, [item])[0],
    )


@router.get("/price-history", response_model=ProductCatalogPriceHistoryResponse)
def list_product_price_history(
    product_id: int | None = None,
    connector_id: int | None = None,
    current_user=Depends(require_products_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> ProductCatalogPriceHistoryResponse:
    rows = service.list_price_history(
        tenant_db,
        product_id=product_id,
        connector_id=connector_id,
    )
    return ProductCatalogPriceHistoryResponse(
        success=True,
        message="Historial de precios recuperado correctamente",
        requested_by=build_products_requested_by(current_user),
        total=len(rows),
        data=_serialize_prices(tenant_db, rows),
    )


@router.post("/catalog/{product_id}/price-history", response_model=ProductCatalogPriceHistoryResponse)
def create_product_price_history(
    product_id: int,
    payload: ProductCatalogPriceHistoryCreateRequest,
    current_user=Depends(require_products_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> ProductCatalogPriceHistoryResponse:
    try:
        item = service.create_price_entry(tenant_db, product_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return ProductCatalogPriceHistoryResponse(
        success=True,
        message="Evento de precio registrado correctamente",
        requested_by=build_products_requested_by(current_user),
        total=1,
        data=_serialize_prices(tenant_db, [item]),
    )
