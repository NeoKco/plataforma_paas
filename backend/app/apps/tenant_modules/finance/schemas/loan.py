from datetime import date, datetime

from pydantic import BaseModel

from app.apps.tenant_modules.finance.schemas.common import FinanceResponseBase


class FinanceLoanCreateRequest(BaseModel):
    name: str
    loan_type: str
    counterparty_name: str
    currency_id: int
    principal_amount: float
    current_balance: float
    interest_rate: float | None = None
    installments_count: int | None = None
    payment_frequency: str = "monthly"
    start_date: date
    due_date: date | None = None
    note: str | None = None
    is_active: bool = True


class FinanceLoanUpdateRequest(FinanceLoanCreateRequest):
    pass


class FinanceLoanItemResponse(BaseModel):
    id: int
    name: str
    loan_type: str
    loan_status: str
    counterparty_name: str
    currency_id: int
    currency_code: str
    principal_amount: float
    current_balance: float
    paid_amount: float
    interest_rate: float | None = None
    installments_count: int | None = None
    payment_frequency: str
    next_due_date: date | None = None
    installments_total: int
    installments_paid: int
    start_date: date
    due_date: date | None = None
    note: str | None = None
    is_active: bool
    created_at: datetime
    updated_at: datetime


class FinanceLoanInstallmentItemResponse(BaseModel):
    id: int
    loan_id: int
    installment_number: int
    due_date: date
    planned_amount: float
    principal_amount: float
    interest_amount: float
    paid_amount: float
    paid_at: date | None = None
    installment_status: str
    note: str | None = None
    created_at: datetime
    updated_at: datetime


class FinanceLoanInstallmentPaymentRequest(BaseModel):
    paid_amount: float
    paid_at: date | None = None
    note: str | None = None


class FinanceLoanInstallmentReversalRequest(BaseModel):
    reversed_amount: float
    note: str | None = None


class FinanceLoansSummaryData(BaseModel):
    total_items: int
    active_items: int
    borrowed_balance: float
    lent_balance: float
    total_principal: float


class FinanceLoansResponse(FinanceResponseBase):
    total: int
    summary: FinanceLoansSummaryData
    data: list[FinanceLoanItemResponse]


class FinanceLoanDetailData(BaseModel):
    loan: FinanceLoanItemResponse
    installments: list[FinanceLoanInstallmentItemResponse]


class FinanceLoanDetailResponse(FinanceResponseBase):
    data: FinanceLoanDetailData


class FinanceLoanMutationResponse(FinanceResponseBase):
    data: FinanceLoanItemResponse


class FinanceLoanInstallmentPaymentData(BaseModel):
    loan: FinanceLoanItemResponse
    installment: FinanceLoanInstallmentItemResponse


class FinanceLoanInstallmentPaymentResponse(FinanceResponseBase):
    data: FinanceLoanInstallmentPaymentData


class FinanceLoanInstallmentReversalData(BaseModel):
    loan: FinanceLoanItemResponse
    installment: FinanceLoanInstallmentItemResponse


class FinanceLoanInstallmentReversalResponse(FinanceResponseBase):
    data: FinanceLoanInstallmentReversalData
