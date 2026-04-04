from datetime import datetime

from pydantic import BaseModel

from app.apps.tenant_modules.business_core.schemas.common import BusinessCoreResponseBase


class BusinessWorkGroupMemberBase(BaseModel):
    tenant_user_id: int
    function_profile_id: int | None = None
    is_primary: bool = False
    is_lead: bool = False
    is_active: bool = True
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    notes: str | None = None


class BusinessWorkGroupMemberCreateRequest(BusinessWorkGroupMemberBase):
    pass


class BusinessWorkGroupMemberUpdateRequest(BusinessWorkGroupMemberBase):
    pass


class BusinessWorkGroupMemberItemResponse(BusinessWorkGroupMemberBase):
    id: int
    group_id: int
    user_full_name: str
    user_email: str
    function_profile_name: str | None = None
    created_at: datetime
    updated_at: datetime


class BusinessWorkGroupMembersResponse(BusinessCoreResponseBase):
    total: int
    data: list[BusinessWorkGroupMemberItemResponse]


class BusinessWorkGroupMemberMutationResponse(BusinessCoreResponseBase):
    data: BusinessWorkGroupMemberItemResponse
