from fastapi import APIRouter

from app.apps.tenant_modules.techdocs.api.overview import router as overview_router
from app.apps.tenant_modules.techdocs.api.routes import router as audit_router
from app.apps.tenant_modules.techdocs.api.dossiers import router as dossiers_router

router = APIRouter()
router.include_router(overview_router)
router.include_router(dossiers_router)
router.include_router(audit_router)
