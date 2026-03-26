from pydantic import BaseModel

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
