from datetime import datetime

from pydantic import BaseModel

from app.apps.tenant_modules.business_core.schemas.common import BusinessCoreResponseBase


class BusinessFunctionProfileBase(BaseModel):
    code: str
    name: str
    description: str | None = None
    is_active: bool = True
    sort_order: int = 100


class BusinessFunctionProfileCreateRequest(BusinessFunctionProfileBase):
    pass


class BusinessFunctionProfileUpdateRequest(BusinessFunctionProfileBase):
    pass


class BusinessFunctionProfileItemResponse(BusinessFunctionProfileBase):
    id: int
    created_at: datetime
    updated_at: datetime


class BusinessFunctionProfileMutationResponse(BusinessCoreResponseBase):
    data: BusinessFunctionProfileItemResponse


class BusinessFunctionProfilesResponse(BusinessCoreResponseBase):
    total: int
    data: list[BusinessFunctionProfileItemResponse]
