from fastapi import APIRouter

from app.apps.tenant_modules.finance.api.accounts import router as accounts_router
from app.apps.tenant_modules.finance.api.beneficiaries import (
    router as beneficiaries_router,
)
from app.apps.tenant_modules.finance.api.categories import router as categories_router
from app.apps.tenant_modules.finance.api.currencies import router as currencies_router
from app.apps.tenant_modules.finance.api.people import router as people_router
from app.apps.tenant_modules.finance.api.projects import router as projects_router
from app.apps.tenant_modules.finance.api.settings import router as settings_router
from app.apps.tenant_modules.finance.api.tags import router as tags_router
from app.apps.tenant_modules.finance.api.transactions import router as transactions_router

router = APIRouter(tags=["Tenant Finance"])
router.include_router(accounts_router)
router.include_router(categories_router)
router.include_router(beneficiaries_router)
router.include_router(people_router)
router.include_router(projects_router)
router.include_router(tags_router)
router.include_router(currencies_router)
router.include_router(settings_router)
router.include_router(transactions_router)
