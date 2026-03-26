from fastapi import APIRouter

from app.apps.tenant_modules.finance.api.transactions import router as transactions_router

router = APIRouter(tags=["Tenant Finance"])
router.include_router(transactions_router)
