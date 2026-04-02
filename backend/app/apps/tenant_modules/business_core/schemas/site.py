from datetime import datetime

from pydantic import BaseModel

from app.apps.tenant_modules.business_core.schemas.common import BusinessCoreResponseBase


class BusinessSiteBase(BaseModel):
    client_id: int
    name: str
    site_code: str | None = None
    address_line: str | None = None
    city: str | None = None
    region: str | None = None
    country_code: str | None = "CL"
    reference_notes: str | None = None
    is_active: bool = True
    sort_order: int = 100


class BusinessSiteCreateRequest(BusinessSiteBase):
    pass


class BusinessSiteUpdateRequest(BusinessSiteBase):
    pass


class BusinessSiteItemResponse(BusinessSiteBase):
    id: int
    created_at: datetime
    updated_at: datetime


class BusinessSiteMutationResponse(BusinessCoreResponseBase):
    data: BusinessSiteItemResponse


class BusinessSitesResponse(BusinessCoreResponseBase):
    total: int
    data: list[BusinessSiteItemResponse]
