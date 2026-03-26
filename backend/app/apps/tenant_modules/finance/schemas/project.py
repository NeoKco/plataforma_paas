from datetime import datetime

from pydantic import BaseModel


class FinanceProjectBase(BaseModel):
    name: str
    code: str | None = None
    note: str | None = None
    is_active: bool = True
    sort_order: int = 100


class FinanceProjectCreateRequest(FinanceProjectBase):
    pass


class FinanceProjectUpdateRequest(FinanceProjectBase):
    pass


class FinanceProjectItemResponse(FinanceProjectBase):
    id: int
    created_at: datetime
    updated_at: datetime
