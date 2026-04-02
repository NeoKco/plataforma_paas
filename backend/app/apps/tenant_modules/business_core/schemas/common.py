from pydantic import BaseModel

from app.apps.tenant_modules.core.schemas import TenantUserContextResponse


class BusinessCoreResponseBase(BaseModel):
    success: bool
    message: str
    requested_by: TenantUserContextResponse


class BusinessCoreStatusUpdateRequest(BaseModel):
    is_active: bool
