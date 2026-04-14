from datetime import datetime

from pydantic import BaseModel, Field

from app.apps.tenant_modules.maintenance.schemas.common import MaintenanceResponseBase


class MaintenanceCostLineWriteItem(BaseModel):
    id: int | None = None
    line_type: str
    description: str | None = None
    quantity: float = 1
    unit_cost: float = 0
    notes: str | None = None
    include_in_expense: bool = True


class MaintenanceCostEstimateWriteRequest(BaseModel):
    labor_cost: float = 0
    travel_cost: float = 0
    materials_cost: float = 0
    external_services_cost: float = 0
    overhead_cost: float = 0
    target_margin_percent: float = 0
    suggested_price: float | None = None
    notes: str | None = None
    lines: list[MaintenanceCostLineWriteItem] = Field(default_factory=list)


class MaintenanceCostActualWriteRequest(BaseModel):
    labor_cost: float = 0
    travel_cost: float = 0
    materials_cost: float = 0
    external_services_cost: float = 0
    overhead_cost: float = 0
    actual_price_charged: float = 0
    applied_template_id: int | None = None
    notes: str | None = None
    lines: list[MaintenanceCostLineWriteItem] = Field(default_factory=list)


class MaintenanceFinanceSyncRequest(BaseModel):
    sync_income: bool = True
    sync_expense: bool = True
    income_account_id: int | None = None
    expense_account_id: int | None = None
    income_category_id: int | None = None
    expense_category_id: int | None = None
    currency_id: int
    transaction_at: datetime | None = None
    income_description: str | None = None
    expense_description: str | None = None
    notes: str | None = None


class MaintenanceFinanceSyncDefaultsData(BaseModel):
    maintenance_finance_sync_mode: str
    maintenance_finance_auto_sync_income: bool
    maintenance_finance_auto_sync_expense: bool
    maintenance_finance_income_account_id: int | None = None
    maintenance_finance_income_account_source: str | None = None
    maintenance_finance_expense_account_id: int | None = None
    maintenance_finance_expense_account_source: str | None = None
    maintenance_finance_income_category_id: int | None = None
    maintenance_finance_income_category_source: str | None = None
    maintenance_finance_expense_category_id: int | None = None
    maintenance_finance_expense_category_source: str | None = None
    maintenance_finance_currency_id: int | None = None
    maintenance_finance_currency_source: str | None = None


class MaintenanceFinanceTransactionSnapshotResponse(BaseModel):
    transaction_id: int
    account_id: int | None = None
    category_id: int | None = None
    currency_id: int
    transaction_at: datetime
    description: str
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
    include_in_expense: bool
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
    applied_cost_template_id: int | None = None
    applied_cost_template_name_snapshot: str | None = None
    notes: str | None = None
    income_transaction_id: int | None = None
    expense_transaction_id: int | None = None
    finance_synced_at: datetime | None = None
    income_transaction_snapshot: MaintenanceFinanceTransactionSnapshotResponse | None = None
    expense_transaction_snapshot: MaintenanceFinanceTransactionSnapshotResponse | None = None
    created_by_user_id: int | None = None
    updated_by_user_id: int | None = None
    created_at: datetime
    updated_at: datetime


class MaintenanceCostingDetailData(BaseModel):
    work_order_id: int
    estimate: MaintenanceCostEstimateItemResponse | None = None
    estimate_lines: list[MaintenanceCostLineItemResponse] = Field(default_factory=list)
    actual: MaintenanceCostActualItemResponse | None = None
    actual_lines: list[MaintenanceCostLineItemResponse] = Field(default_factory=list)


class MaintenanceCostingDetailResponse(MaintenanceResponseBase):
    data: MaintenanceCostingDetailData


class MaintenanceCostingMutationResponse(MaintenanceResponseBase):
    data: MaintenanceCostingDetailData


class MaintenanceFinanceSyncDefaultsResponse(MaintenanceResponseBase):
    data: MaintenanceFinanceSyncDefaultsData
