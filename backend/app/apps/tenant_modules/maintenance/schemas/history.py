from datetime import datetime

from pydantic import BaseModel

from app.apps.tenant_modules.maintenance.schemas.common import MaintenanceResponseBase


class MaintenanceStatusLogItemResponse(BaseModel):
    id: int
    work_order_id: int
    from_status: str | None = None
    to_status: str
    note: str | None = None
    changed_by_user_id: int | None = None
    changed_at: datetime


class MaintenanceVisitItemResponse(BaseModel):
    id: int
    work_order_id: int
    visit_status: str
    scheduled_start_at: datetime | None = None
    scheduled_end_at: datetime | None = None
    actual_start_at: datetime | None = None
    actual_end_at: datetime | None = None
    assigned_work_group_id: int | None = None
    assigned_tenant_user_id: int | None = None
    assigned_group_label: str | None = None
    notes: str | None = None
    created_at: datetime
    updated_at: datetime


class MaintenanceHistoryWorkOrderItemResponse(BaseModel):
    id: int
    client_id: int
    site_id: int
    installation_id: int | None = None
    schedule_id: int | None = None
    due_item_id: int | None = None
    billing_mode: str | None = None
    external_reference: str | None = None
    title: str
    description: str | None = None
    priority: str
    cancellation_reason: str | None = None
    closure_notes: str | None = None
    assigned_work_group_id: int | None = None
    assigned_tenant_user_id: int | None = None
    maintenance_status: str
    requested_at: datetime
    scheduled_for: datetime | None = None
    completed_at: datetime | None = None
    cancelled_at: datetime | None = None
    created_by_user_id: int | None = None
    created_at: datetime
    updated_at: datetime
    status_logs: list[MaintenanceStatusLogItemResponse]
    visits: list[MaintenanceVisitItemResponse]


class MaintenanceHistoryResponse(MaintenanceResponseBase):
    total: int
    data: list[MaintenanceHistoryWorkOrderItemResponse]


class MaintenanceStatusLogsResponse(MaintenanceResponseBase):
    total: int
    data: list[MaintenanceStatusLogItemResponse]


class MaintenanceVisitsResponse(MaintenanceResponseBase):
    total: int
    data: list[MaintenanceVisitItemResponse]
