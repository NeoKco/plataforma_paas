from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.common.auth.dependencies import get_current_tenant_context

router = APIRouter(prefix="/tenant/business-core", tags=["Tenant Business Core"])


class TenantBusinessCoreOverviewResponse(BaseModel):
    success: bool
    module_key: str
    module_name: str
    status: str
    phase: str
    message: str
    first_wave_entities: list[str]
    dependent_modules: list[str]


@router.get("/overview", response_model=TenantBusinessCoreOverviewResponse)
def get_business_core_overview(
    current_user=Depends(get_current_tenant_context),
) -> TenantBusinessCoreOverviewResponse:
    _ = current_user
    return TenantBusinessCoreOverviewResponse(
        success=True,
        module_key="business-core",
        module_name="Business Core",
        status="in_progress",
        phase="wave_2_taxonomy_live",
        message=(
            "Business core wave 2 is active. Organizations, clients, "
            "contacts, sites, functional profiles, work groups, and task "
            "types already expose tenant CRUD as the shared domain for "
            "maintenance, projects, and future IoT."
        ),
        first_wave_entities=[
            "organizations",
            "clients",
            "contacts",
            "sites",
            "function_profiles",
            "work_groups",
            "task_types",
        ],
        dependent_modules=[
            "maintenance",
            "projects",
            "iot",
        ],
    )
