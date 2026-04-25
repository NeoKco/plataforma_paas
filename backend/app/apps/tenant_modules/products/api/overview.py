from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.apps.tenant_modules.products.api.serializers import (
    build_product_catalog_ingestion_draft_item,
    build_product_catalog_item,
)
from app.apps.tenant_modules.products.dependencies import (
    build_products_requested_by,
    require_products_read,
)
from app.apps.tenant_modules.products.schemas import ProductCatalogModuleOverviewResponse
from app.apps.tenant_modules.products.services import (
    ProductCatalogIngestionService,
    ProductCatalogOverviewService,
    ProductCatalogService,
)
from app.common.db.session_manager import get_tenant_db

router = APIRouter(prefix="/tenant/products", tags=["Tenant Products"])
overview_service = ProductCatalogOverviewService()
product_service = ProductCatalogService()
ingestion_service = ProductCatalogIngestionService()


@router.get("/overview", response_model=ProductCatalogModuleOverviewResponse)
def get_product_catalog_overview(
    current_user=Depends(require_products_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> ProductCatalogModuleOverviewResponse:
    product_rows = product_service.list_products(tenant_db, include_inactive=True)[:5]
    product_characteristics = product_service.get_characteristics_map(
        tenant_db,
        [item.id for item in product_rows],
    )
    recent_draft_rows = ingestion_service.list_drafts(tenant_db, capture_status=None)[:5]
    recent_draft_characteristics = ingestion_service.get_characteristics_map(
        tenant_db,
        [item.id for item in recent_draft_rows],
    )
    published_name_map = product_service.get_product_name_map(
        tenant_db,
        [item.published_product_id for item in recent_draft_rows if item.published_product_id],
    )
    return ProductCatalogModuleOverviewResponse(
        success=True,
        message="Resumen del catálogo recuperado correctamente",
        requested_by=build_products_requested_by(current_user),
        metrics=overview_service.build_overview(tenant_db),
        recent_products=[
            build_product_catalog_item(item, characteristics=product_characteristics.get(item.id, []))
            for item in product_rows
        ],
        recent_drafts=[
            build_product_catalog_ingestion_draft_item(
                item,
                characteristics=recent_draft_characteristics.get(item.id, []),
                published_product_name=published_name_map.get(item.published_product_id),
            )
            for item in recent_draft_rows
        ],
    )
