from pydantic import BaseModel

from app.apps.tenant_modules.core.schemas import TenantUserContextResponse


class MaintenanceResponseBase(BaseModel):
    success: bool
    message: str
    requested_by: TenantUserContextResponse


class MaintenanceStatusUpdateRequest(BaseModel):
    maintenance_status: str
    note: str | None = None
