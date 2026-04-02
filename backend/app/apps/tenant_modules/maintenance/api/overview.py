from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.common.auth.dependencies import get_current_tenant_context

router = APIRouter(prefix="/tenant/maintenance", tags=["Tenant Maintenance"])


class TenantMaintenanceOverviewResponse(BaseModel):
    success: bool
    module_key: str
    module_name: str
    status: str
    phase: str
    message: str
    recommended_first_slice: list[str]


@router.get("/overview", response_model=TenantMaintenanceOverviewResponse)
def get_maintenance_module_overview(
    current_user=Depends(get_current_tenant_context),
) -> TenantMaintenanceOverviewResponse:
    _ = current_user
    return TenantMaintenanceOverviewResponse(
        success=True,
        module_key="maintenance",
        module_name="Maintenance",
        status="planned",
        phase="scaffolded",
        message=(
            "Maintenance module scaffold active. The first implementation slice "
            "covers work orders, installations, equipment types, history, and "
            "calendar integration."
        ),
        recommended_first_slice=[
            "equipment_types",
            "installations",
            "work_orders",
            "history",
            "calendar_sync",
        ],
    )
