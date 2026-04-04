from datetime import datetime

from pydantic import BaseModel

from app.apps.tenant_modules.business_core.schemas.common import BusinessCoreResponseBase


class BusinessWorkGroupBase(BaseModel):
    code: str | None = None
    name: str
    description: str | None = None
    group_kind: str = "operations"
    is_active: bool = True
    sort_order: int = 100


class BusinessWorkGroupCreateRequest(BusinessWorkGroupBase):
    pass


class BusinessWorkGroupUpdateRequest(BusinessWorkGroupBase):
    pass


class BusinessWorkGroupItemResponse(BusinessWorkGroupBase):
    id: int
    member_count: int = 0
    created_at: datetime
    updated_at: datetime


class BusinessWorkGroupMutationResponse(BusinessCoreResponseBase):
    data: BusinessWorkGroupItemResponse


class BusinessWorkGroupsResponse(BusinessCoreResponseBase):
    total: int
    data: list[BusinessWorkGroupItemResponse]
