from fastapi import APIRouter

from app.apps.tenant_modules.maintenance.api.equipment_types import (
    router as equipment_types_router,
)
from app.apps.tenant_modules.maintenance.api.installations import (
    router as installations_router,
)
from app.apps.tenant_modules.maintenance.api.overview import router as overview_router
from app.apps.tenant_modules.maintenance.api.work_orders import (
    router as work_orders_router,
)

router = APIRouter()
router.include_router(overview_router)
router.include_router(equipment_types_router)
router.include_router(installations_router)
router.include_router(work_orders_router)
