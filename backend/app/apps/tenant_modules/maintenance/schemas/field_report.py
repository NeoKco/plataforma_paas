from datetime import datetime

from pydantic import BaseModel, Field

from app.apps.tenant_modules.maintenance.schemas.common import MaintenanceResponseBase


class MaintenanceFieldReportChecklistItemWriteItem(BaseModel):
    item_key: str
    label: str
    is_completed: bool = False
    notes: str | None = None


class MaintenanceFieldReportChecklistItemResponse(BaseModel):
    id: int | None = None
    work_order_id: int | None = None
    item_key: str
    label: str
    is_completed: bool = False
    notes: str | None = None
    sort_order: int = 0
    updated_by_user_id: int | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None


class MaintenanceWorkOrderEvidenceItemResponse(BaseModel):
    id: int
    work_order_id: int
    file_name: str
    content_type: str | None = None
    file_size: int
    notes: str | None = None
    uploaded_by_user_id: int | None = None
    created_at: datetime


class MaintenanceFieldReportUpdateRequest(BaseModel):
    closure_notes: str | None = None
    checklist_items: list[MaintenanceFieldReportChecklistItemWriteItem] = Field(default_factory=list)


class MaintenanceFieldReportData(BaseModel):
    work_order_id: int
    closure_notes: str | None = None
    checklist_items: list[MaintenanceFieldReportChecklistItemResponse] = Field(default_factory=list)
    evidences: list[MaintenanceWorkOrderEvidenceItemResponse] = Field(default_factory=list)


class MaintenanceFieldReportResponse(MaintenanceResponseBase):
    data: MaintenanceFieldReportData


class MaintenanceWorkOrderEvidenceMutationResponse(MaintenanceResponseBase):
    data: MaintenanceWorkOrderEvidenceItemResponse


class MaintenanceWorkOrderEvidenceDeleteResponse(MaintenanceResponseBase):
    data: dict[str, int]