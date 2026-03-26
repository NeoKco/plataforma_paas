from datetime import datetime

from pydantic import BaseModel


class FinanceExchangeRateBase(BaseModel):
    source_currency_id: int
    target_currency_id: int
    rate: float
    effective_at: datetime
    source: str | None = None
    note: str | None = None


class FinanceExchangeRateCreateRequest(FinanceExchangeRateBase):
    pass


class FinanceExchangeRateUpdateRequest(FinanceExchangeRateBase):
    pass


class FinanceExchangeRateItemResponse(FinanceExchangeRateBase):
    id: int
    created_at: datetime
