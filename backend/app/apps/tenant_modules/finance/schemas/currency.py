from datetime import datetime

from pydantic import BaseModel


class FinanceCurrencyBase(BaseModel):
    code: str
    name: str
    symbol: str
    decimal_places: int = 2
    is_base: bool = False
    is_active: bool = True
    sort_order: int = 100


class FinanceCurrencyCreateRequest(FinanceCurrencyBase):
    pass


class FinanceCurrencyUpdateRequest(FinanceCurrencyBase):
    pass


class FinanceCurrencyItemResponse(FinanceCurrencyBase):
    id: int
    created_at: datetime
    updated_at: datetime
