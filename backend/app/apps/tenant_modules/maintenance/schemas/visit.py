from datetime import datetime

from pydantic import BaseModel

from app.apps.tenant_modules.maintenance.schemas.common import MaintenanceResponseBase


class MaintenanceVisitBase(BaseModel):
    work_order_id: int
    visit_type: str = "execution"
    visit_status: str = "scheduled"
    visit_result: str | None = None
    scheduled_start_at: datetime | None = None
    scheduled_end_at: datetime | None = None
    actual_start_at: datetime | None = None
    actual_end_at: datetime | None = None
    assigned_work_group_id: int | None = None
    assigned_tenant_user_id: int | None = None
    assigned_group_label: str | None = None
    notes: str | None = None


class MaintenanceVisitCreateRequest(MaintenanceVisitBase):
    pass


class MaintenanceVisitUpdateRequest(MaintenanceVisitBase):
    pass


class MaintenanceVisitMutationResponse(MaintenanceResponseBase):
    data: "MaintenanceVisitItemResponse"


from app.apps.tenant_modules.maintenance.schemas.history import (  # noqa: E402
    MaintenanceVisitItemResponse,
    MaintenanceVisitsResponse,
)
