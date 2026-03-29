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


class FinanceBudgetCloneRequest(BaseModel):
    source_period_month: date
    target_period_month: date
    overwrite_existing: bool = False


class FinanceBudgetGuidedAdjustmentRequest(BaseModel):
    adjustment_mode: str
    margin_percent: float | None = None


class FinanceBudgetTemplateApplyRequest(BaseModel):
    target_period_month: date
    template_mode: str
    overwrite_existing: bool = False
    scale_percent: float | None = None
    round_to_amount: float | None = None


class FinanceBudgetItemResponse(BaseModel):
    id: int
    period_month: date
    category_id: int
    category_name: str
    category_type: str
    budget_status: str
    amount: float
    actual_amount: float
    variance_amount: float
    utilization_ratio: float | None = None
    note: str | None = None
    is_active: bool
    created_at: datetime
    updated_at: datetime


class FinanceBudgetFocusItemResponse(BaseModel):
    id: int
    category_id: int
    category_name: str
    category_type: str
    budget_status: str
    recommended_action: str
    amount: float
    actual_amount: float
    variance_amount: float
    utilization_ratio: float | None = None
    is_active: bool


class FinanceBudgetMutationResponse(FinanceResponseBase):
    data: FinanceBudgetItemResponse


class FinanceBudgetCloneData(BaseModel):
    source_period_month: date
    target_period_month: date
    cloned_count: int
    updated_count: int
    skipped_count: int


class FinanceBudgetCloneResponse(FinanceResponseBase):
    data: FinanceBudgetCloneData


class FinanceBudgetGuidedAdjustmentData(BaseModel):
    adjustment_mode: str
    budget: FinanceBudgetItemResponse


class FinanceBudgetGuidedAdjustmentResponse(FinanceResponseBase):
    data: FinanceBudgetGuidedAdjustmentData


class FinanceBudgetTemplateApplyData(BaseModel):
    target_period_month: date
    template_mode: str
    source_period_month: date | None = None
    scale_percent: float | None = None
    round_to_amount: float | None = None
    cloned_count: int
    updated_count: int
    skipped_count: int


class FinanceBudgetTemplateApplyResponse(FinanceResponseBase):
    data: FinanceBudgetTemplateApplyData


class FinanceBudgetsSummaryData(BaseModel):
    period_month: date
    total_budgeted: float
    total_actual: float
    total_variance: float
    total_items: int
    income_budgeted: float
    income_actual: float
    expense_budgeted: float
    expense_actual: float
    over_budget_items: int
    within_budget_items: int
    unused_items: int
    inactive_items: int


class FinanceBudgetsResponse(FinanceResponseBase):
    total: int
    summary: FinanceBudgetsSummaryData
    focus_items: list[FinanceBudgetFocusItemResponse]
    data: list[FinanceBudgetItemResponse]
