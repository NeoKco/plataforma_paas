from datetime import date, datetime

from pydantic import BaseModel, Field

from app.apps.tenant_modules.finance.schemas.common import FinanceResponseBase


class FinanceEntryCreateRequest(BaseModel):
    movement_type: str
    concept: str
    amount: float
    category: str | None = None


class FinanceEntryItemResponse(BaseModel):
    id: int
    movement_type: str
    concept: str
    amount: float
    category: str | None = None
    created_by_user_id: int | None = None


class FinanceEntryMutationResponse(FinanceResponseBase):
    data: FinanceEntryItemResponse


class FinanceEntriesResponse(FinanceResponseBase):
    total: int
    data: list[FinanceEntryItemResponse]


class FinanceTransactionCreateRequest(BaseModel):
    transaction_type: str
    account_id: int | None = None
    target_account_id: int | None = None
    category_id: int | None = None
    beneficiary_id: int | None = None
    person_id: int | None = None
    project_id: int | None = None
    currency_id: int
    loan_id: int | None = None
    amount: float
    discount_amount: float = 0
    exchange_rate: float | None = None
    amortization_months: int | None = None
    transaction_at: datetime
    alternative_date: date | None = None
    description: str
    notes: str | None = None
    is_favorite: bool = False
    is_reconciled: bool = False
    tag_ids: list[int] | None = None


class FinanceTransactionUpdateRequest(FinanceTransactionCreateRequest):
    pass


class FinanceTransactionFiltersRequest(BaseModel):
    transaction_type: str | None = None
    account_id: int | None = None
    category_id: int | None = None
    tag_id: int | None = None
    is_favorite: bool | None = None
    is_reconciled: bool | None = None
    search: str | None = None


class FinanceTransactionItemResponse(BaseModel):
    id: int
    transaction_type: str
    account_id: int | None = None
    target_account_id: int | None = None
    category_id: int | None = None
    beneficiary_id: int | None = None
    person_id: int | None = None
    project_id: int | None = None
    currency_id: int
    loan_id: int | None = None
    amount: float
    amount_in_base_currency: float | None = None
    exchange_rate: float | None = None
    discount_amount: float = 0
    amortization_months: int | None = None
    transaction_at: datetime
    alternative_date: date | None = None
    description: str
    notes: str | None = None
    is_favorite: bool = False
    favorite_flag: bool = False
    is_reconciled: bool = False
    reconciled_at: datetime | None = None
    is_voided: bool = False
    voided_at: datetime | None = None
    void_reason: str | None = None
    voided_by_user_id: int | None = None
    is_template_origin: bool = False
    source_type: str | None = None
    source_id: int | None = None
    created_by_user_id: int | None = None
    updated_by_user_id: int | None = None
    tag_ids: list[int] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime


class FinanceTransactionMutationResponse(FinanceResponseBase):
    data: FinanceTransactionItemResponse


class FinanceTransactionsResponse(FinanceResponseBase):
    total: int
    data: list[FinanceTransactionItemResponse]


class FinanceTransactionAuditItemResponse(BaseModel):
    id: int
    event_type: str
    actor_user_id: int | None = None
    summary: str
    payload: dict | None = None
    created_at: datetime


class FinanceTransactionAttachmentItemResponse(BaseModel):
    id: int
    transaction_id: int
    file_name: str
    content_type: str | None = None
    file_size: int
    notes: str | None = None
    uploaded_by_user_id: int | None = None
    created_at: datetime


class FinanceTransactionDetailData(BaseModel):
    transaction: FinanceTransactionItemResponse
    audit_events: list[FinanceTransactionAuditItemResponse]
    attachments: list[FinanceTransactionAttachmentItemResponse]


class FinanceTransactionDetailResponse(FinanceResponseBase):
    data: FinanceTransactionDetailData


class FinanceTransactionAttachmentMutationResponse(FinanceResponseBase):
    data: FinanceTransactionAttachmentItemResponse


class FinanceTransactionAttachmentDeleteData(BaseModel):
    attachment_id: int
    transaction_id: int


class FinanceTransactionAttachmentDeleteResponse(FinanceResponseBase):
    data: FinanceTransactionAttachmentDeleteData


class FinanceTransactionFavoriteUpdateRequest(BaseModel):
    is_favorite: bool


class FinanceTransactionReconciliationUpdateRequest(BaseModel):
    is_reconciled: bool
    reason_code: str | None = None
    note: str | None = None


class FinanceTransactionFavoriteBatchUpdateRequest(BaseModel):
    transaction_ids: list[int]
    is_favorite: bool


class FinanceTransactionReconciliationBatchUpdateRequest(BaseModel):
    transaction_ids: list[int]
    is_reconciled: bool
    reason_code: str | None = None
    note: str | None = None


class FinanceTransactionVoidRequest(BaseModel):
    reason: str | None = None


class FinanceTransactionBatchMutationData(BaseModel):
    affected_count: int
    transaction_ids: list[int]


class FinanceTransactionBatchMutationResponse(FinanceResponseBase):
    data: FinanceTransactionBatchMutationData


class FinanceAccountBalanceItem(BaseModel):
    account_id: int
    account_name: str
    account_type: str
    currency_id: int
    balance: float
    is_balance_hidden: bool = False


class FinanceAccountBalancesResponse(FinanceResponseBase):
    total: int
    data: list[FinanceAccountBalanceItem]


class FinanceSummaryData(BaseModel):
    total_income: float
    total_expense: float
    balance: float
    total_entries: int


class FinanceSummaryResponse(FinanceResponseBase):
    data: FinanceSummaryData


class FinanceUsageData(BaseModel):
    module_key: str
    used_entries: int
    max_entries: int | None = None
    remaining_entries: int | None = None
    unlimited: bool = False
    at_limit: bool = False
    limit_source: str | None = None


class FinanceUsageResponse(FinanceResponseBase):
    data: FinanceUsageData
