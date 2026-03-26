from datetime import datetime

from pydantic import BaseModel

from app.apps.tenant_modules.finance.schemas.common import FinanceResponseBase


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


class FinanceProjectMutationResponse(FinanceResponseBase):
    data: FinanceProjectItemResponse


class FinanceProjectsResponse(FinanceResponseBase):
    total: int
    data: list[FinanceProjectItemResponse]
