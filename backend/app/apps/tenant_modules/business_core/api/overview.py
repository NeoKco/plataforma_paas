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
        status="planned",
        phase="scaffolded",
        message=(
            "Business core scaffold active. The first implementation wave covers "
            "organizations, clients, contacts, and sites as the shared tenant "
            "domain for maintenance, projects, and future IoT."
        ),
        first_wave_entities=[
            "organizations",
            "clients",
            "contacts",
            "sites",
        ],
        dependent_modules=[
            "maintenance",
            "projects",
            "iot",
        ],
    )
