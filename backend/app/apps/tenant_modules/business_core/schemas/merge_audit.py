from datetime import datetime

from pydantic import BaseModel

from app.apps.tenant_modules.business_core.schemas.common import BusinessCoreResponseBase


class BusinessCoreMergeAuditBase(BaseModel):
    entity_kind: str
    entity_id: int
    summary: str
    payload: dict | None = None


class BusinessCoreMergeAuditCreateRequest(BusinessCoreMergeAuditBase):
    pass


class BusinessCoreMergeAuditItemResponse(BusinessCoreMergeAuditBase):
    id: int
    requested_by_user_id: int | None = None
    requested_by_email: str | None = None
    requested_by_role: str | None = None
    created_at: datetime


class BusinessCoreMergeAuditMutationResponse(BusinessCoreResponseBase):
    data: BusinessCoreMergeAuditItemResponse


class BusinessCoreMergeAuditsResponse(BusinessCoreResponseBase):
    total: int
    data: list[BusinessCoreMergeAuditItemResponse]
