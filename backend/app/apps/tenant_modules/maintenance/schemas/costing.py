from datetime import datetime

from pydantic import BaseModel

from app.apps.tenant_modules.maintenance.schemas.common import MaintenanceResponseBase


class MaintenanceCostLineWriteItem(BaseModel):
    id: int | None = None
    line_type: str
    description: str | None = None
    quantity: float = 1
    unit_cost: float = 0
    notes: str | None = None


class MaintenanceCostEstimateWriteRequest(BaseModel):
    labor_cost: float = 0
    travel_cost: float = 0
    materials_cost: float = 0
    external_services_cost: float = 0
    overhead_cost: float = 0
    target_margin_percent: float = 0
    notes: str | None = None
    lines: list[MaintenanceCostLineWriteItem] = []


class MaintenanceCostActualWriteRequest(BaseModel):
    labor_cost: float = 0
    travel_cost: float = 0
    materials_cost: float = 0
    external_services_cost: float = 0
    overhead_cost: float = 0
    actual_price_charged: float = 0
    notes: str | None = None
    lines: list[MaintenanceCostLineWriteItem] = []


class MaintenanceFinanceSyncRequest(BaseModel):
    sync_income: bool = True
    sync_expense: bool = True
    income_account_id: int | None = None
    expense_account_id: int | None = None
    income_category_id: int | None = None
    expense_category_id: int | None = None
    currency_id: int
    transaction_at: datetime | None = None
    notes: str | None = None


class MaintenanceCostEstimateItemResponse(BaseModel):
    id: int
    work_order_id: int
    labor_cost: float
    travel_cost: float
    materials_cost: float
    external_services_cost: float
    overhead_cost: float
    total_estimated_cost: float
    target_margin_percent: float
    suggested_price: float
    notes: str | None = None
    created_by_user_id: int | None = None
    updated_by_user_id: int | None = None
    created_at: datetime
    updated_at: datetime


class MaintenanceCostLineItemResponse(BaseModel):
    id: int
    work_order_id: int
    cost_stage: str
    line_type: str
    description: str | None = None
    quantity: float
    unit_cost: float
    total_cost: float
    finance_transaction_id: int | None = None
    notes: str | None = None
    created_by_user_id: int | None = None
    updated_by_user_id: int | None = None
    created_at: datetime
    updated_at: datetime


class MaintenanceCostActualItemResponse(BaseModel):
    id: int
    work_order_id: int
    labor_cost: float
    travel_cost: float
    materials_cost: float
    external_services_cost: float
    overhead_cost: float
    total_actual_cost: float
    actual_price_charged: float
    actual_income: float
    actual_profit: float
    actual_margin_percent: float | None = None
    notes: str | None = None
    income_transaction_id: int | None = None
    expense_transaction_id: int | None = None
    finance_synced_at: datetime | None = None
    created_by_user_id: int | None = None
    updated_by_user_id: int | None = None
    created_at: datetime
    updated_at: datetime


class MaintenanceCostingDetailData(BaseModel):
    work_order_id: int
    estimate: MaintenanceCostEstimateItemResponse | None = None
    estimate_lines: list[MaintenanceCostLineItemResponse] = []
    actual: MaintenanceCostActualItemResponse | None = None
    actual_lines: list[MaintenanceCostLineItemResponse] = []


class MaintenanceCostingDetailResponse(MaintenanceResponseBase):
    data: MaintenanceCostingDetailData


class MaintenanceCostingMutationResponse(MaintenanceResponseBase):
    data: MaintenanceCostingDetailData
