from datetime import datetime

from pydantic import BaseModel, Field

from app.apps.tenant_modules.business_core.schemas.common import BusinessCoreResponseBase


class BusinessTaskTypeBase(BaseModel):
    code: str | None = None
    name: str
    description: str | None = None
    color: str | None = None
    icon: str | None = None
    is_active: bool = True
    sort_order: int = 100
    compatible_function_profile_ids: list[int] = Field(default_factory=list)


class BusinessTaskTypeCreateRequest(BusinessTaskTypeBase):
    pass


class BusinessTaskTypeUpdateRequest(BusinessTaskTypeBase):
    pass


class BusinessTaskTypeItemResponse(BusinessTaskTypeBase):
    id: int
    compatible_function_profile_names: list[str] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime


class BusinessTaskTypeMutationResponse(BusinessCoreResponseBase):
    data: BusinessTaskTypeItemResponse


class BusinessTaskTypesResponse(BusinessCoreResponseBase):
    total: int
    data: list[BusinessTaskTypeItemResponse]
