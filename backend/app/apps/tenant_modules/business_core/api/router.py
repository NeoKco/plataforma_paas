from fastapi import APIRouter

from app.apps.tenant_modules.business_core.api.clients import router as clients_router
from app.apps.tenant_modules.business_core.api.contacts import router as contacts_router
from app.apps.tenant_modules.business_core.api.organizations import (
    router as organizations_router,
)
from app.apps.tenant_modules.business_core.api.overview import router as overview_router
from app.apps.tenant_modules.business_core.api.sites import router as sites_router

router = APIRouter()
router.include_router(overview_router)
router.include_router(organizations_router)
router.include_router(clients_router)
router.include_router(contacts_router)
router.include_router(sites_router)
