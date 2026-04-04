from datetime import datetime

from pydantic import BaseModel

from app.apps.tenant_modules.maintenance.schemas.common import MaintenanceResponseBase
from app.apps.tenant_modules.maintenance.schemas.work_order import (
    MaintenanceWorkOrderItemResponse,
)


class MaintenanceDueItemItemResponse(BaseModel):
    id: int
    schedule_id: int
    client_id: int
    site_id: int | None = None
    installation_id: int | None = None
    due_at: datetime
    visible_from: datetime
    due_status: str
    contact_status: str
    assigned_work_group_id: int | None = None
    assigned_tenant_user_id: int | None = None
    work_order_id: int | None = None
    postponed_until: datetime | None = None
    contact_note: str | None = None
    resolution_note: str | None = None
    schedule_name: str
    schedule_description: str | None = None
    task_type_id: int | None = None
    default_priority: str
    billing_mode: str
    created_at: datetime
    updated_at: datetime


class MaintenanceDueItemsResponse(MaintenanceResponseBase):
    total: int
    data: list[MaintenanceDueItemItemResponse]


class MaintenanceDueItemMutationResponse(MaintenanceResponseBase):
    data: MaintenanceDueItemItemResponse


class MaintenanceDueItemContactRequest(BaseModel):
    contact_status: str
    contact_note: str | None = None


class MaintenanceDueItemPostponeRequest(BaseModel):
    postponed_until: datetime
    resolution_note: str | None = None


class MaintenanceDueItemScheduleRequest(BaseModel):
    scheduled_for: datetime | None = None
    site_id: int | None = None
    installation_id: int | None = None
    title: str | None = None
    description: str | None = None
    priority: str | None = None
    assigned_work_group_id: int | None = None
    assigned_tenant_user_id: int | None = None


class MaintenanceDueItemScheduleResponse(MaintenanceResponseBase):
    data: MaintenanceDueItemItemResponse
    work_order: MaintenanceWorkOrderItemResponse
