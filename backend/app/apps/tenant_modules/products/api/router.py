from app.apps.tenant_modules.products.api.ingestion import router as ingestion_router
from app.apps.tenant_modules.products.api.overview import router as overview_router
from app.apps.tenant_modules.products.api.products import router as products_router
from fastapi import APIRouter

router = APIRouter()
router.include_router(overview_router)
router.include_router(products_router)
router.include_router(ingestion_router)
