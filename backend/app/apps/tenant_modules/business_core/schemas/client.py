from datetime import datetime

from pydantic import BaseModel

from app.apps.tenant_modules.business_core.schemas.common import BusinessCoreResponseBase


class BusinessClientBase(BaseModel):
    organization_id: int
    social_community_group_id: int | None = None
    client_code: str | None = None
    service_status: str = "active"
    commercial_notes: str | None = None
    is_active: bool = True
    sort_order: int = 100


class BusinessClientCreateRequest(BusinessClientBase):
    pass


class BusinessClientUpdateRequest(BusinessClientBase):
    pass


class BusinessClientItemResponse(BusinessClientBase):
    id: int
    created_at: datetime
    updated_at: datetime


class BusinessClientMutationResponse(BusinessCoreResponseBase):
    data: BusinessClientItemResponse


class BusinessClientsResponse(BusinessCoreResponseBase):
    total: int
    data: list[BusinessClientItemResponse]
