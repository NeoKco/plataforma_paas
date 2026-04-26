from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.apps.tenant_modules.products.api.serializers import (
    build_product_refresh_run,
    build_product_scheduler_connector_item,
)
from app.apps.tenant_modules.products.dependencies import (
    build_products_requested_by,
    require_products_manage,
    require_products_read,
)
from app.apps.tenant_modules.products.schemas import (
    ProductCatalogSchedulerBatchRunItemResponse,
    ProductCatalogSchedulerBatchRunResponse,
    ProductCatalogSchedulerOverviewResponse,
)
from app.apps.tenant_modules.products.services import (
    ProductCatalogRefreshRunService,
    ProductConnectorSchedulerService,
    ProductConnectorService,
)
from app.common.db.session_manager import get_tenant_db

router = APIRouter(prefix="/tenant/products/scheduler", tags=["Tenant Products"])
scheduler_service = ProductConnectorSchedulerService()
refresh_run_service = ProductCatalogRefreshRunService()
connector_service = ProductConnectorService()


@router.get("/overview", response_model=ProductCatalogSchedulerOverviewResponse)
def get_products_scheduler_overview(
    current_user=Depends(require_products_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> ProductCatalogSchedulerOverviewResponse:
    summary = scheduler_service.build_scheduler_overview(tenant_db)
    connectors = summary["due_connectors"]
    due_map = summary["due_source_count_map"]
    recent_runs = summary["recent_runs"]
    connector_names = {}
    if recent_runs:
        connector_ids = [item.connector_id for item in recent_runs if getattr(item, "connector_id", None)]
        if connector_ids:
            connector_rows = connector_service.list_connectors(tenant_db, include_inactive=True)
            connector_names = {item.id: item.name for item in connector_rows if item.id in connector_ids}
    run_items = refresh_run_service.get_run_item_map(tenant_db, [item.id for item in recent_runs])
    return ProductCatalogSchedulerOverviewResponse(
        success=True,
        message="Automatización recuperada correctamente",
        requested_by=build_products_requested_by(current_user),
        due_total=summary["due_total"],
        data=[
            build_product_scheduler_connector_item(
                item,
                due_source_count=due_map.get(item.id, 0),
            )
            for item in connectors
        ],
        recent_runs=[
            build_product_refresh_run(
                item,
                items=run_items.get(item.id, []),
                connector_name=connector_names.get(item.connector_id),
            )
            for item in recent_runs
        ],
    )


@router.post("/run-due", response_model=ProductCatalogSchedulerBatchRunResponse)
def run_products_scheduler_due_connectors(
    current_user=Depends(require_products_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> ProductCatalogSchedulerBatchRunResponse:
    try:
        summary = scheduler_service.run_due_connector_schedules_for_tenant(
            tenant_db,
            actor_user_id=getattr(current_user, "id", None),
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return ProductCatalogSchedulerBatchRunResponse(
        success=True,
        message="Scheduler tenant ejecutado correctamente",
        requested_by=build_products_requested_by(current_user),
        processed=summary["processed"],
        launched=summary["launched"],
        failed=summary["failed"],
        data=[
            ProductCatalogSchedulerBatchRunItemResponse(
                connector_id=int(item["connector_id"]),
                connector_name=item["connector_name"],
                status=item["status"],
                run_id=item.get("run_id"),
                processed_count=int(item.get("processed_count", 0) or 0),
                completed_count=int(item.get("completed_count", 0) or 0),
                error_count=int(item.get("error_count", 0) or 0),
                detail=item.get("error"),
            )
            for item in summary["items"]
        ],
    )
