from pydantic import BaseModel

from app.apps.tenant_modules.core.schemas import TenantUserContextResponse


class FinanceResponseBase(BaseModel):
    success: bool
    message: str
    requested_by: TenantUserContextResponse


class FinanceStatusUpdateRequest(BaseModel):
    is_active: bool


class FinanceReorderItemRequest(BaseModel):
    id: int
    sort_order: int


class FinanceReorderRequest(BaseModel):
    items: list[FinanceReorderItemRequest]
