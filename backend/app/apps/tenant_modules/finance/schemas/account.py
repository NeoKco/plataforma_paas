from datetime import datetime

from pydantic import BaseModel


class FinanceAccountBase(BaseModel):
    name: str
    code: str | None = None
    account_type: str
    currency_id: int
    parent_account_id: int | None = None
    opening_balance: float = 0
    opening_balance_at: datetime | None = None
    icon: str | None = None
    is_favorite: bool = False
    is_balance_hidden: bool = False
    is_active: bool = True
    sort_order: int = 100


class FinanceAccountCreateRequest(FinanceAccountBase):
    pass


class FinanceAccountUpdateRequest(FinanceAccountBase):
    pass


class FinanceAccountItemResponse(FinanceAccountBase):
    id: int
    created_at: datetime
    updated_at: datetime
