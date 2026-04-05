from datetime import datetime

from pydantic import BaseModel, Field

from app.apps.tenant_modules.maintenance.schemas.common import MaintenanceResponseBase


class MaintenanceScheduleBase(BaseModel):
    client_id: int
    site_id: int | None = None
    installation_id: int | None = None
    task_type_id: int | None = None
    cost_template_id: int | None = None
    name: str
    description: str | None = None
    frequency_value: int
    frequency_unit: str = "months"
    lead_days: int = 30
    start_mode: str = "from_manual_due_date"
    base_date: datetime | None = None
    last_executed_at: datetime | None = None
    next_due_at: datetime
    default_priority: str = "normal"
    estimated_duration_minutes: int | None = None
    billing_mode: str = "per_work_order"
    estimate_target_margin_percent: float = 0
    estimate_notes: str | None = None
    is_active: bool = True
    auto_create_due_items: bool = True
    notes: str | None = None


class MaintenanceScheduleEstimateLineWriteItem(BaseModel):
    id: int | None = None
    line_type: str
    description: str | None = None
    quantity: float = 1
    unit_cost: float = 0
    notes: str | None = None


class MaintenanceScheduleEstimateLineItemResponse(BaseModel):
    id: int
    schedule_id: int
    line_type: str
    description: str | None = None
    quantity: float
    unit_cost: float
    total_cost: float
    sort_order: int
    notes: str | None = None
    created_by_user_id: int | None = None
    updated_by_user_id: int | None = None
    created_at: datetime
    updated_at: datetime


class MaintenanceScheduleCreateRequest(MaintenanceScheduleBase):
    estimate_lines: list[MaintenanceScheduleEstimateLineWriteItem] = Field(default_factory=list)


class MaintenanceScheduleUpdateRequest(MaintenanceScheduleBase):
    estimate_lines: list[MaintenanceScheduleEstimateLineWriteItem] = Field(default_factory=list)


class MaintenanceScheduleStatusRequest(BaseModel):
    is_active: bool


class MaintenanceScheduleItemResponse(MaintenanceScheduleBase):
    id: int
    estimate_lines: list[MaintenanceScheduleEstimateLineItemResponse] = Field(default_factory=list)
    created_by_user_id: int | None = None
    created_at: datetime
    updated_at: datetime


class MaintenanceScheduleSuggestionItemResponse(BaseModel):
    client_id: int
    site_id: int | None = None
    installation_id: int | None = None
    suggested_next_due_at: datetime | None = None
    suggested_frequency_value: int | None = None
    suggested_frequency_unit: str | None = None
    last_executed_at: datetime | None = None
    source: str = "none"
    reference_work_order_id: int | None = None
    reference_completed_at: datetime | None = None


class MaintenanceScheduleMutationResponse(MaintenanceResponseBase):
    data: MaintenanceScheduleItemResponse


class MaintenanceSchedulesResponse(MaintenanceResponseBase):
    total: int
    data: list[MaintenanceScheduleItemResponse]


class MaintenanceScheduleSuggestionResponse(MaintenanceResponseBase):
    data: MaintenanceScheduleSuggestionItemResponse
