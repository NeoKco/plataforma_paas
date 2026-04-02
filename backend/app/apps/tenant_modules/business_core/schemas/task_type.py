from datetime import datetime

from pydantic import BaseModel

from app.apps.tenant_modules.business_core.schemas.common import BusinessCoreResponseBase


class BusinessTaskTypeBase(BaseModel):
    code: str
    name: str
    description: str | None = None
    color: str | None = None
    icon: str | None = None
    is_active: bool = True
    sort_order: int = 100


class BusinessTaskTypeCreateRequest(BusinessTaskTypeBase):
    pass


class BusinessTaskTypeUpdateRequest(BusinessTaskTypeBase):
    pass


class BusinessTaskTypeItemResponse(BusinessTaskTypeBase):
    id: int
    created_at: datetime
    updated_at: datetime


class BusinessTaskTypeMutationResponse(BusinessCoreResponseBase):
    data: BusinessTaskTypeItemResponse


class BusinessTaskTypesResponse(BusinessCoreResponseBase):
    total: int
    data: list[BusinessTaskTypeItemResponse]
