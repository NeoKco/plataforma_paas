from datetime import datetime

from pydantic import BaseModel

from app.apps.tenant_modules.business_core.schemas.common import BusinessCoreResponseBase


class BusinessAssetBase(BaseModel):
    site_id: int
    asset_type_id: int
    name: str
    asset_code: str | None = None
    serial_number: str | None = None
    manufacturer: str | None = None
    model: str | None = None
    asset_status: str = "active"
    installed_at: datetime | None = None
    last_service_at: datetime | None = None
    warranty_until: datetime | None = None
    location_note: str | None = None
    technical_notes: str | None = None
    is_active: bool = True
    sort_order: int = 100


class BusinessAssetCreateRequest(BusinessAssetBase):
    pass


class BusinessAssetUpdateRequest(BusinessAssetBase):
    pass


class BusinessAssetItemResponse(BusinessAssetBase):
    id: int
    site_name: str
    site_label: str
    asset_type_name: str
    created_at: datetime
    updated_at: datetime


class BusinessAssetMutationResponse(BusinessCoreResponseBase):
    data: BusinessAssetItemResponse


class BusinessAssetsResponse(BusinessCoreResponseBase):
    total: int
    data: list[BusinessAssetItemResponse]
