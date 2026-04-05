from fastapi import APIRouter

from app.apps.tenant_modules.maintenance.api.cost_templates import (
    router as cost_templates_router,
)
from app.apps.tenant_modules.maintenance.api.costing import router as costing_router
from app.apps.tenant_modules.maintenance.api.due_items import router as due_items_router
from app.apps.tenant_modules.maintenance.api.equipment_types import (
    router as equipment_types_router,
)
from app.apps.tenant_modules.maintenance.api.field_reports import (
    router as field_reports_router,
)
from app.apps.tenant_modules.maintenance.api.history import router as history_router
from app.apps.tenant_modules.maintenance.api.installations import (
    router as installations_router,
)
from app.apps.tenant_modules.maintenance.api.overview import router as overview_router
from app.apps.tenant_modules.maintenance.api.schedules import router as schedules_router
from app.apps.tenant_modules.maintenance.api.visits import router as visits_router
from app.apps.tenant_modules.maintenance.api.work_orders import (
    router as work_orders_router,
)

router = APIRouter()
router.include_router(overview_router)
router.include_router(cost_templates_router)
router.include_router(schedules_router)
router.include_router(due_items_router)
router.include_router(costing_router)
router.include_router(equipment_types_router)
router.include_router(installations_router)
router.include_router(work_orders_router)
router.include_router(field_reports_router)
router.include_router(visits_router)
router.include_router(history_router)
