from datetime import datetime

from pydantic import BaseModel, Field

from app.apps.tenant_modules.maintenance.schemas.common import MaintenanceResponseBase


class MaintenanceCostTemplateLineWriteItem(BaseModel):
    id: int | None = None
    line_type: str
    description: str | None = None
    quantity: float = 1
    unit_cost: float = 0
    notes: str | None = None


class MaintenanceCostTemplateLineItemResponse(BaseModel):
    id: int
    template_id: int
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


class MaintenanceCostTemplateBase(BaseModel):
    name: str
    description: str | None = None
    task_type_id: int | None = None
    estimate_target_margin_percent: float = 0
    estimate_notes: str | None = None
    is_active: bool = True


class MaintenanceCostTemplateCreateRequest(MaintenanceCostTemplateBase):
    lines: list[MaintenanceCostTemplateLineWriteItem] = Field(default_factory=list)


class MaintenanceCostTemplateUpdateRequest(MaintenanceCostTemplateBase):
    lines: list[MaintenanceCostTemplateLineWriteItem] = Field(default_factory=list)


class MaintenanceCostTemplateStatusRequest(BaseModel):
    is_active: bool


class MaintenanceCostTemplateItemResponse(MaintenanceCostTemplateBase):
    id: int
    usage_count: int = 0
    lines: list[MaintenanceCostTemplateLineItemResponse] = Field(default_factory=list)
    created_by_user_id: int | None = None
    updated_by_user_id: int | None = None
    created_at: datetime
    updated_at: datetime


class MaintenanceCostTemplateMutationResponse(MaintenanceResponseBase):
    data: MaintenanceCostTemplateItemResponse


class MaintenanceCostTemplatesResponse(MaintenanceResponseBase):
    total: int
    data: list[MaintenanceCostTemplateItemResponse]
