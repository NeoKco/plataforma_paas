from fastapi import APIRouter

from app.apps.tenant_modules.chat.api.conversations import router as conversations_router
from app.apps.tenant_modules.chat.api.overview import router as overview_router
from app.apps.tenant_modules.chat.api.routes import router as activity_router

router = APIRouter()
router.include_router(overview_router)
router.include_router(conversations_router)
router.include_router(activity_router)
