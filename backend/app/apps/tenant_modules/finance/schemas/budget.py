from datetime import date, datetime

from pydantic import BaseModel

from app.apps.tenant_modules.finance.schemas.common import FinanceResponseBase


class FinanceBudgetCreateRequest(BaseModel):
    period_month: date
    category_id: int
    amount: float
    note: str | None = None
    is_active: bool = True


class FinanceBudgetUpdateRequest(FinanceBudgetCreateRequest):
    pass


class FinanceBudgetItemResponse(BaseModel):
    id: int
    period_month: date
    category_id: int
    category_name: str
    category_type: str
    amount: float
    actual_amount: float
    variance_amount: float
    utilization_ratio: float | None = None
    note: str | None = None
    is_active: bool
    created_at: datetime
    updated_at: datetime


class FinanceBudgetMutationResponse(FinanceResponseBase):
    data: FinanceBudgetItemResponse


class FinanceBudgetsSummaryData(BaseModel):
    period_month: date
    total_budgeted: float
    total_actual: float
    total_variance: float
    total_items: int


class FinanceBudgetsResponse(FinanceResponseBase):
    total: int
    summary: FinanceBudgetsSummaryData
    data: list[FinanceBudgetItemResponse]
