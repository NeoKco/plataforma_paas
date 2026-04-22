from datetime import datetime

from pydantic import BaseModel

from app.apps.tenant_modules.business_core.schemas.common import BusinessCoreResponseBase


class SocialCommunityGroupBase(BaseModel):
    name: str
    commune: str | None = None
    sector: str | None = None
    zone: str | None = None
    territorial_classification: str | None = None
    notes: str | None = None
    is_active: bool = True
    sort_order: int = 100


class SocialCommunityGroupCreateRequest(SocialCommunityGroupBase):
    pass


class SocialCommunityGroupUpdateRequest(SocialCommunityGroupBase):
    pass


class SocialCommunityGroupItemResponse(SocialCommunityGroupBase):
    id: int
    created_at: datetime
    updated_at: datetime


class SocialCommunityGroupMutationResponse(BusinessCoreResponseBase):
    data: SocialCommunityGroupItemResponse


class SocialCommunityGroupsResponse(BusinessCoreResponseBase):
    total: int
    data: list[SocialCommunityGroupItemResponse]
