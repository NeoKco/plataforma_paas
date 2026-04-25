from fastapi import APIRouter

from app.apps.tenant_modules.crm.api.opportunities import router as opportunities_router
from app.apps.tenant_modules.crm.api.overview import router as overview_router
from app.apps.tenant_modules.crm.api.quotes import router as quotes_router
from app.apps.tenant_modules.crm.api.templates import router as templates_router

router = APIRouter()
router.include_router(overview_router)
router.include_router(opportunities_router)
router.include_router(quotes_router)
router.include_router(templates_router)
