from pydantic import BaseModel

from app.apps.tenant_modules.core.schemas import TenantUserContextResponse


class FinanceResponseBase(BaseModel):
    success: bool
    message: str
    requested_by: TenantUserContextResponse
