from datetime import datetime

from pydantic import BaseModel


class FinanceTagBase(BaseModel):
    name: str
    color: str | None = None
    is_active: bool = True
    sort_order: int = 100


class FinanceTagCreateRequest(FinanceTagBase):
    pass


class FinanceTagUpdateRequest(FinanceTagBase):
    pass


class FinanceTagItemResponse(FinanceTagBase):
    id: int
    created_at: datetime
    updated_at: datetime
