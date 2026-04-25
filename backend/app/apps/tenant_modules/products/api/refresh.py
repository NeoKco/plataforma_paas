from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session

from app.apps.tenant_modules.products.api.serializers import (
    build_product_catalog_item,
    build_product_refresh_result,
    build_product_refresh_run,
)
from app.apps.tenant_modules.products.dependencies import (
    build_products_requested_by,
    require_products_manage,
    require_products_read,
)
from app.apps.tenant_modules.products.schemas import (
    ProductCatalogRefreshMutationResponse,
    ProductCatalogRefreshNowRequest,
    ProductCatalogRefreshRunCreateRequest,
    ProductCatalogRefreshRunMutationResponse,
    ProductCatalogRefreshRunsResponse,
)
from app.apps.tenant_modules.products.services import (
    ProductCatalogRefreshRunService,
    ProductCatalogRefreshService,
    ProductCatalogService,
    ProductSourceService,
)
from app.common.db.session_manager import get_tenant_db

router = APIRouter(prefix="/tenant/products", tags=["Tenant Products"])
refresh_service = ProductCatalogRefreshService()
run_service = ProductCatalogRefreshRunService()
product_service = ProductCatalogService()
source_service = ProductSourceService()


def _build_runs_payload(tenant_db: Session, runs: list):
    run_item_map = run_service.get_run_item_map(tenant_db, [item.id for item in runs]) if runs else {}
    connector_ids = [item.connector_id for item in runs if getattr(item, "connector_id", None)]
    product_ids = [
        run_item.product_id
        for run_items in run_item_map.values()
        for run_item in run_items
        if getattr(run_item, "product_id", None)
    ]
    connector_map, product_map = source_service.build_maps(
        tenant_db,
        connector_ids=connector_ids,
        product_ids=product_ids,
    )
    return [
        build_product_refresh_run(
            item,
            items=run_item_map.get(item.id, []),
            connector_name=connector_map.get(getattr(item, "connector_id", None)),
            product_names=product_map,
        )
        for item in runs
    ]


@router.post("/catalog/{product_id}/refresh", response_model=ProductCatalogRefreshMutationResponse)
def refresh_product_catalog_item_now(
    product_id: int,
    payload: ProductCatalogRefreshNowRequest,
    current_user=Depends(require_products_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> ProductCatalogRefreshMutationResponse:
    try:
        product, result = refresh_service.refresh_product(
            tenant_db,
            product_id,
            prefer_ai=payload.prefer_ai,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    health_map = source_service.build_product_health_map(tenant_db, [product.id])
    characteristic_map = product_service.get_characteristics_map(tenant_db, [product.id])
    return ProductCatalogRefreshMutationResponse(
        success=True,
        message="Producto actualizado correctamente",
        requested_by=build_products_requested_by(current_user),
        product=build_product_catalog_item(
            product,
            characteristics=characteristic_map.get(product.id, []),
            health=health_map.get(product.id),
        ),
        result=build_product_refresh_result(result),
    )


@router.get("/refresh-runs", response_model=ProductCatalogRefreshRunsResponse)
def list_product_catalog_refresh_runs(
    current_user=Depends(require_products_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> ProductCatalogRefreshRunsResponse:
    runs = run_service.list_runs(tenant_db)
    return ProductCatalogRefreshRunsResponse(
        success=True,
        message="Corridas de actualización recuperadas correctamente",
        requested_by=build_products_requested_by(current_user),
        total=len(runs),
        data=_build_runs_payload(tenant_db, runs),
    )


@router.post("/refresh-runs", response_model=ProductCatalogRefreshRunMutationResponse)
def create_product_catalog_refresh_run(
    payload: ProductCatalogRefreshRunCreateRequest,
    background_tasks: BackgroundTasks,
    current_user=Depends(require_products_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> ProductCatalogRefreshRunMutationResponse:
    try:
        run = run_service.create_run(
            tenant_db,
            payload,
            actor_user_id=current_user["user_id"],
        )
        background_tasks.add_task(
            run_service.process_run_background,
            tenant_slug=current_user["tenant_slug"],
            run_id=run.id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return ProductCatalogRefreshRunMutationResponse(
        success=True,
        message="Corrida de actualización creada correctamente",
        requested_by=build_products_requested_by(current_user),
        data=_build_runs_payload(tenant_db, [run])[0],
    )


@router.get("/refresh-runs/{run_id}", response_model=ProductCatalogRefreshRunMutationResponse)
def get_product_catalog_refresh_run(
    run_id: int,
    current_user=Depends(require_products_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> ProductCatalogRefreshRunMutationResponse:
    try:
        run = run_service.get_run(tenant_db, run_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return ProductCatalogRefreshRunMutationResponse(
        success=True,
        message="Corrida de actualización recuperada correctamente",
        requested_by=build_products_requested_by(current_user),
        data=_build_runs_payload(tenant_db, [run])[0],
    )


@router.post("/refresh-runs/{run_id}/cancel", response_model=ProductCatalogRefreshRunMutationResponse)
def cancel_product_catalog_refresh_run(
    run_id: int,
    current_user=Depends(require_products_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> ProductCatalogRefreshRunMutationResponse:
    try:
        run = run_service.cancel_run(tenant_db, run_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return ProductCatalogRefreshRunMutationResponse(
        success=True,
        message="Corrida cancelada correctamente",
        requested_by=build_products_requested_by(current_user),
        data=_build_runs_payload(tenant_db, [run])[0],
    )
