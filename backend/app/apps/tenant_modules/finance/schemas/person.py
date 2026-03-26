from datetime import datetime

from pydantic import BaseModel

from app.apps.tenant_modules.finance.schemas.common import FinanceResponseBase


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


class FinancePersonMutationResponse(FinanceResponseBase):
    data: FinancePersonItemResponse


class FinancePeopleResponse(FinanceResponseBase):
    total: int
    data: list[FinancePersonItemResponse]
