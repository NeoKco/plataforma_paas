from datetime import datetime

from pydantic import BaseModel

from app.apps.tenant_modules.business_core.schemas.common import BusinessCoreResponseBase


class BusinessContactBase(BaseModel):
    organization_id: int
    full_name: str
    email: str | None = None
    phone: str | None = None
    role_title: str | None = None
    is_primary: bool = False
    is_active: bool = True
    sort_order: int = 100


class BusinessContactCreateRequest(BusinessContactBase):
    pass


class BusinessContactUpdateRequest(BusinessContactBase):
    pass


class BusinessContactItemResponse(BusinessContactBase):
    id: int
    created_at: datetime
    updated_at: datetime


class BusinessContactMutationResponse(BusinessCoreResponseBase):
    data: BusinessContactItemResponse


class BusinessContactsResponse(BusinessCoreResponseBase):
    total: int
    data: list[BusinessContactItemResponse]
