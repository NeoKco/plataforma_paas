from datetime import datetime

from pydantic import BaseModel

from app.apps.tenant_modules.finance.schemas.common import FinanceResponseBase


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


class FinanceTagMutationResponse(FinanceResponseBase):
    data: FinanceTagItemResponse


class FinanceTagsResponse(FinanceResponseBase):
    total: int
    data: list[FinanceTagItemResponse]
