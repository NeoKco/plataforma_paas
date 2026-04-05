from datetime import datetime

from pydantic import BaseModel

from app.apps.tenant_modules.business_core.schemas.common import BusinessCoreResponseBase


class BusinessOrganizationBase(BaseModel):
    name: str
    legal_name: str | None = None
    tax_id: str | None = None
    organization_kind: str = "client"
    phone: str | None = None
    email: str | None = None
    address_line: str | None = None
    commune: str | None = None
    city: str | None = None
    region: str | None = None
    country_code: str | None = None
    notes: str | None = None
    is_active: bool = True
    sort_order: int = 100


class BusinessOrganizationCreateRequest(BusinessOrganizationBase):
    pass


class BusinessOrganizationUpdateRequest(BusinessOrganizationBase):
    pass


class BusinessOrganizationItemResponse(BusinessOrganizationBase):
    id: int
    created_at: datetime
    updated_at: datetime


class BusinessOrganizationMutationResponse(BusinessCoreResponseBase):
    data: BusinessOrganizationItemResponse


class BusinessOrganizationsResponse(BusinessCoreResponseBase):
    total: int
    data: list[BusinessOrganizationItemResponse]
