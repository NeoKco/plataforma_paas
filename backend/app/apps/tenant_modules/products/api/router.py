from app.apps.tenant_modules.products.api.comparisons import router as comparisons_router
from app.apps.tenant_modules.products.api.connectors import router as connectors_router
from app.apps.tenant_modules.products.api.ingestion import router as ingestion_router
from app.apps.tenant_modules.products.api.overview import router as overview_router
from app.apps.tenant_modules.products.api.products import router as products_router
from app.apps.tenant_modules.products.api.sources import router as sources_router
from fastapi import APIRouter

router = APIRouter()
router.include_router(overview_router)
router.include_router(products_router)
router.include_router(ingestion_router)
router.include_router(sources_router)
router.include_router(comparisons_router)
router.include_router(connectors_router)
