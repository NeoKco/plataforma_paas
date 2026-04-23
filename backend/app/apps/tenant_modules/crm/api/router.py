from fastapi import APIRouter

from app.apps.tenant_modules.crm.api.opportunities import router as opportunities_router
from app.apps.tenant_modules.crm.api.overview import router as overview_router
from app.apps.tenant_modules.crm.api.products import router as products_router
from app.apps.tenant_modules.crm.api.quotes import router as quotes_router

router = APIRouter()
router.include_router(overview_router)
router.include_router(products_router)
router.include_router(opportunities_router)
router.include_router(quotes_router)
