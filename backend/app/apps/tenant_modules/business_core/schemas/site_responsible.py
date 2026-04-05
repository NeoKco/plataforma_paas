from datetime import datetime

from pydantic import BaseModel

from app.apps.tenant_modules.business_core.schemas.common import BusinessCoreResponseBase


class BusinessSiteResponsibleBase(BaseModel):
    site_id: int
    tenant_user_id: int
    responsibility_kind: str = "primary"
    is_primary: bool = False
    is_active: bool = True
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    notes: str | None = None


class BusinessSiteResponsibleCreateRequest(BusinessSiteResponsibleBase):
    pass


class BusinessSiteResponsibleUpdateRequest(BusinessSiteResponsibleBase):
    pass


class BusinessSiteResponsibleItemResponse(BusinessSiteResponsibleBase):
    id: int
    site_name: str
    site_label: str
    user_full_name: str
    user_email: str
    created_at: datetime
    updated_at: datetime


class BusinessSiteResponsiblesResponse(BusinessCoreResponseBase):
    total: int
    data: list[BusinessSiteResponsibleItemResponse]


class BusinessSiteResponsibleMutationResponse(BusinessCoreResponseBase):
    data: BusinessSiteResponsibleItemResponse
