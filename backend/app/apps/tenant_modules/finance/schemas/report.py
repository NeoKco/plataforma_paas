from datetime import date

from pydantic import BaseModel

from app.apps.tenant_modules.finance.schemas.common import FinanceResponseBase


class FinanceReportCategoryAmountItem(BaseModel):
    category_id: int
    category_name: str
    category_type: str
    total_amount: float


class FinanceReportTransactionSnapshot(BaseModel):
    period_month: date
    total_income: float
    total_expense: float
    net_balance: float
    total_transactions: int
    reconciled_count: int
    unreconciled_count: int
    favorite_count: int
    loan_linked_count: int


class FinanceReportBudgetSnapshot(BaseModel):
    period_month: date
    total_budgeted: float
    total_actual: float
    total_variance: float
    total_items: int
    over_budget_count: int
    within_budget_count: int
    inactive_count: int
    unused_count: int


class FinanceReportLoanSnapshot(BaseModel):
    borrowed_balance: float
    lent_balance: float
    total_principal: float
    total_items: int
    active_items: int
    open_items: int
    settled_items: int


class FinanceReportDailyCashflowItem(BaseModel):
    day: date
    income_total: float
    expense_total: float
    net_total: float
    transaction_count: int


class FinanceReportBudgetVarianceItem(BaseModel):
    category_id: int
    category_name: str
    category_type: str
    budget_status: str
    planned_amount: float
    actual_amount: float
    variance_amount: float
    utilization_ratio: float | None
    is_active: bool


class FinanceReportPeriodComparison(BaseModel):
    current_period_month: date
    previous_period_month: date
    previous_income: float
    previous_expense: float
    previous_net_balance: float
    previous_transactions: int
    previous_budgeted: float
    previous_actual: float
    previous_variance: float
    income_delta: float
    expense_delta: float
    net_balance_delta: float
    transaction_delta: int
    budgeted_delta: float
    actual_delta: float
    variance_delta: float


class FinanceReportMonthlyTrendItem(BaseModel):
    period_month: date
    total_income: float
    total_expense: float
    net_balance: float
    total_transactions: int
    total_budgeted: float
    total_actual: float
    total_variance: float


class FinanceReportTrendSummary(BaseModel):
    months_covered: int
    first_period_month: date | None
    last_period_month: date | None
    total_income: float
    total_expense: float
    total_net_balance: float
    average_income: float
    average_expense: float
    average_net_balance: float
    best_period_month: date | None
    best_net_balance: float | None
    worst_period_month: date | None
    worst_net_balance: float | None
    net_balance_delta_vs_first: float


class FinanceReportOverviewData(BaseModel):
    period_month: date
    movement_scope: str
    budget_category_scope: str
    budget_status_filter: str
    transaction_snapshot: FinanceReportTransactionSnapshot
    budget_snapshot: FinanceReportBudgetSnapshot
    loan_snapshot: FinanceReportLoanSnapshot
    top_income_categories: list[FinanceReportCategoryAmountItem]
    top_expense_categories: list[FinanceReportCategoryAmountItem]
    daily_cashflow: list[FinanceReportDailyCashflowItem]
    budget_variances: list[FinanceReportBudgetVarianceItem]
    period_comparison: FinanceReportPeriodComparison
    monthly_trend: list[FinanceReportMonthlyTrendItem]
    trend_summary: FinanceReportTrendSummary


class FinanceReportOverviewResponse(FinanceResponseBase):
    data: FinanceReportOverviewData
