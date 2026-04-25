from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.apps.tenant_modules.products.api.serializers import build_product_connector_item
from app.apps.tenant_modules.products.dependencies import (
    build_products_requested_by,
    require_products_manage,
    require_products_read,
)
from app.apps.tenant_modules.products.schemas import (
    ProductCatalogConnectorCreateRequest,
    ProductCatalogConnectorMutationResponse,
    ProductCatalogConnectorSyncRequest,
    ProductCatalogConnectorSyncResponse,
    ProductCatalogConnectorsResponse,
    ProductCatalogConnectorStatusUpdateRequest,
    ProductCatalogConnectorUpdateRequest,
)
from app.apps.tenant_modules.products.services import ProductConnectorService, ProductConnectorSyncService
from app.common.db.session_manager import get_tenant_db

router = APIRouter(prefix="/tenant/products/connectors", tags=["Tenant Products"])
service = ProductConnectorService()
sync_service = ProductConnectorSyncService()


def _serialize_connectors(tenant_db: Session, rows: list):
    source_map, price_map = service.build_usage_maps(tenant_db, [item.id for item in rows])
    return [
        build_product_connector_item(
            item,
            source_total=source_map.get(item.id, 0),
            price_event_total=price_map.get(item.id, 0),
        )
        for item in rows
    ]


@router.get("", response_model=ProductCatalogConnectorsResponse)
def list_product_connectors(
    include_inactive: bool = True,
    current_user=Depends(require_products_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> ProductCatalogConnectorsResponse:
    rows = service.list_connectors(tenant_db, include_inactive=include_inactive)
    return ProductCatalogConnectorsResponse(
        success=True,
        message="Conectores recuperados correctamente",
        requested_by=build_products_requested_by(current_user),
        total=len(rows),
        data=_serialize_connectors(tenant_db, rows),
    )


@router.post("", response_model=ProductCatalogConnectorMutationResponse)
def create_product_connector(
    payload: ProductCatalogConnectorCreateRequest,
    current_user=Depends(require_products_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> ProductCatalogConnectorMutationResponse:
    try:
        item = service.create_connector(tenant_db, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return ProductCatalogConnectorMutationResponse(
        success=True,
        message="Conector creado correctamente",
        requested_by=build_products_requested_by(current_user),
        data=_serialize_connectors(tenant_db, [item])[0],
    )


@router.put("/{connector_id}", response_model=ProductCatalogConnectorMutationResponse)
def update_product_connector(
    connector_id: int,
    payload: ProductCatalogConnectorUpdateRequest,
    current_user=Depends(require_products_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> ProductCatalogConnectorMutationResponse:
    try:
        item = service.update_connector(tenant_db, connector_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return ProductCatalogConnectorMutationResponse(
        success=True,
        message="Conector actualizado correctamente",
        requested_by=build_products_requested_by(current_user),
        data=_serialize_connectors(tenant_db, [item])[0],
    )


@router.patch("/{connector_id}/status", response_model=ProductCatalogConnectorMutationResponse)
def update_product_connector_status(
    connector_id: int,
    payload: ProductCatalogConnectorStatusUpdateRequest,
    current_user=Depends(require_products_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> ProductCatalogConnectorMutationResponse:
    try:
        item = service.set_connector_active(tenant_db, connector_id, is_active=payload.is_active)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return ProductCatalogConnectorMutationResponse(
        success=True,
        message="Estado del conector actualizado correctamente",
        requested_by=build_products_requested_by(current_user),
        data=_serialize_connectors(tenant_db, [item])[0],
    )


@router.delete("/{connector_id}", response_model=ProductCatalogConnectorMutationResponse)
def delete_product_connector(
    connector_id: int,
    current_user=Depends(require_products_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> ProductCatalogConnectorMutationResponse:
    try:
        item = service.delete_connector(tenant_db, connector_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return ProductCatalogConnectorMutationResponse(
        success=True,
        message="Conector eliminado correctamente",
        requested_by=build_products_requested_by(current_user),
        data=build_product_connector_item(item),
    )


@router.post("/{connector_id}/sync", response_model=ProductCatalogConnectorSyncResponse)
def sync_product_connector(
    connector_id: int,
    payload: ProductCatalogConnectorSyncRequest,
    current_user=Depends(require_products_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> ProductCatalogConnectorSyncResponse:
    try:
        result = sync_service.sync_connector(
            tenant_db,
            connector_id,
            product_id=payload.product_id,
            limit=payload.limit,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    from app.apps.tenant_modules.products.api.serializers import build_product_connector_sync_item

    return ProductCatalogConnectorSyncResponse(
        success=True,
        message="Sincronización del conector ejecutada correctamente",
        requested_by=build_products_requested_by(current_user),
        connector_id=result["connector_id"],
        connector_name=result["connector_name"],
        processed=result["processed"],
        synced=result["synced"],
        failed=result["failed"],
        skipped=result["skipped"],
        price_updates=result["price_updates"],
        data=[build_product_connector_sync_item(item) for item in result["items"]],
    )
