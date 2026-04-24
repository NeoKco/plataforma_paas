from fastapi import APIRouter

from app.apps.tenant_modules.taskops.api.overview import router as overview_router
from app.apps.tenant_modules.taskops.api.tasks import router as tasks_router

router = APIRouter()
router.include_router(overview_router)
router.include_router(tasks_router)
