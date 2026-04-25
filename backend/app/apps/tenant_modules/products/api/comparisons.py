from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.apps.tenant_modules.products.api.serializers import build_product_comparison_item
from app.apps.tenant_modules.products.dependencies import (
    build_products_requested_by,
    require_products_read,
)
from app.apps.tenant_modules.products.schemas import ProductCatalogComparisonsResponse
from app.apps.tenant_modules.products.services import ProductCatalogComparisonService
from app.common.db.session_manager import get_tenant_db

router = APIRouter(prefix="/tenant/products/comparisons", tags=["Tenant Products"])
service = ProductCatalogComparisonService()


@router.get("", response_model=ProductCatalogComparisonsResponse)
def list_product_comparisons(
    product_id: int | None = None,
    connector_id: int | None = None,
    limit: int = 100,
    current_user=Depends(require_products_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> ProductCatalogComparisonsResponse:
    rows = service.list_comparisons(
        tenant_db,
        product_id=product_id,
        connector_id=connector_id,
        limit=limit,
    )
    return ProductCatalogComparisonsResponse(
        success=True,
        message="Comparación multi-fuente recuperada correctamente",
        requested_by=build_products_requested_by(current_user),
        total=len(rows),
        data=[build_product_comparison_item(item) for item in rows],
    )
