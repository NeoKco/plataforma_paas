from datetime import datetime

from pydantic import BaseModel

from app.apps.tenant_modules.maintenance.schemas.common import MaintenanceResponseBase


class MaintenanceWorkOrderBase(BaseModel):
    client_id: int
    site_id: int
    installation_id: int | None = None
    external_reference: str | None = None
    title: str
    description: str | None = None
    priority: str = "normal"
    scheduled_for: datetime | None = None
    cancellation_reason: str | None = None
    closure_notes: str | None = None
    assigned_work_group_id: int | None = None
    assigned_tenant_user_id: int | None = None


class MaintenanceWorkOrderCreateRequest(MaintenanceWorkOrderBase):
    maintenance_status: str = "scheduled"


class MaintenanceWorkOrderUpdateRequest(MaintenanceWorkOrderBase):
    pass


class MaintenanceWorkOrderItemResponse(MaintenanceWorkOrderBase):
    id: int
    maintenance_status: str
    requested_at: datetime
    completed_at: datetime | None = None
    cancelled_at: datetime | None = None
    created_by_user_id: int | None = None
    created_at: datetime
    updated_at: datetime


class MaintenanceWorkOrderMutationResponse(MaintenanceResponseBase):
    data: MaintenanceWorkOrderItemResponse


class MaintenanceWorkOrdersResponse(MaintenanceResponseBase):
    total: int
    data: list[MaintenanceWorkOrderItemResponse]
