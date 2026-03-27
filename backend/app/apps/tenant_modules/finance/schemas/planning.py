from datetime import date

from pydantic import BaseModel

from app.apps.tenant_modules.finance.schemas.common import FinanceResponseBase


class FinancePlanningDayItem(BaseModel):
    day: date
    income_total: float
    expense_total: float
    net_total: float
    transaction_count: int
    due_installments_count: int


class FinancePlanningLoanDueItem(BaseModel):
    loan_id: int
    loan_name: str
    loan_type: str
    installment_id: int
    installment_number: int
    due_date: date
    planned_amount: float
    paid_amount: float
    remaining_amount: float
    installment_status: str


class FinancePlanningBudgetFocusItem(BaseModel):
    category_id: int
    category_name: str
    category_type: str
    planned_amount: float
    actual_amount: float
    variance_amount: float
    budget_status: str


class FinancePlanningSummary(BaseModel):
    period_month: date
    total_income: float
    total_expense: float
    net_total: float
    total_transactions: int
    due_installments_count: int
    pending_installments_count: int
    expected_loan_cashflow: float
    total_budgeted: float
    total_actual: float
    total_variance: float


class FinancePlanningOverviewData(BaseModel):
    period_month: date
    summary: FinancePlanningSummary
    calendar_days: list[FinancePlanningDayItem]
    loan_due_items: list[FinancePlanningLoanDueItem]
    budget_focus: list[FinancePlanningBudgetFocusItem]


class FinancePlanningOverviewResponse(FinanceResponseBase):
    data: FinancePlanningOverviewData
