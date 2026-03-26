from datetime import datetime

from pydantic import BaseModel


class FinancePersonBase(BaseModel):
    name: str
    icon: str | None = None
    note: str | None = None
    is_active: bool = True
    sort_order: int = 100


class FinancePersonCreateRequest(FinancePersonBase):
    pass


class FinancePersonUpdateRequest(FinancePersonBase):
    pass


class FinancePersonItemResponse(FinancePersonBase):
    id: int
    created_at: datetime
    updated_at: datetime
