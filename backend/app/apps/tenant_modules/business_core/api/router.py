from fastapi import APIRouter

from app.apps.tenant_modules.business_core.api.overview import router as overview_router

router = APIRouter()
router.include_router(overview_router)
