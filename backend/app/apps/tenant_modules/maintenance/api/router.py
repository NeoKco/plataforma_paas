from app.apps.tenant_modules.maintenance.api.overview import router as overview_router

from fastapi import APIRouter

router = APIRouter()
router.include_router(overview_router)
