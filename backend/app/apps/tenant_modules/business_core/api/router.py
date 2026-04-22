from fastapi import APIRouter

from app.apps.tenant_modules.business_core.api.clients import router as clients_router
from app.apps.tenant_modules.business_core.api.contacts import router as contacts_router
from app.apps.tenant_modules.business_core.api.function_profiles import (
    router as function_profiles_router,
)
from app.apps.tenant_modules.business_core.api.asset_types import (
    router as asset_types_router,
)
from app.apps.tenant_modules.business_core.api.assets import router as assets_router
from app.apps.tenant_modules.business_core.api.organizations import (
    router as organizations_router,
)
from app.apps.tenant_modules.business_core.api.social_community_groups import (
    router as social_community_groups_router,
)
from app.apps.tenant_modules.business_core.api.overview import router as overview_router
from app.apps.tenant_modules.business_core.api.merge_audits import (
    router as merge_audits_router,
)
from app.apps.tenant_modules.business_core.api.sites import router as sites_router
from app.apps.tenant_modules.business_core.api.task_types import router as task_types_router
from app.apps.tenant_modules.business_core.api.work_groups import router as work_groups_router
from app.apps.tenant_modules.business_core.api.work_group_members import (
    router as work_group_members_router,
)

router = APIRouter()
router.include_router(overview_router)
router.include_router(merge_audits_router)
router.include_router(organizations_router)
router.include_router(social_community_groups_router)
router.include_router(clients_router)
router.include_router(contacts_router)
router.include_router(sites_router)
router.include_router(function_profiles_router)
router.include_router(asset_types_router)
router.include_router(assets_router)
router.include_router(work_groups_router)
router.include_router(work_group_members_router)
router.include_router(task_types_router)
