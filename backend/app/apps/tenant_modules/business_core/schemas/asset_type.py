from datetime import datetime

from pydantic import BaseModel

from app.apps.tenant_modules.business_core.schemas.common import BusinessCoreResponseBase


class BusinessAssetTypeBase(BaseModel):
    code: str | None = None
    name: str
    description: str | None = None
    is_active: bool = True
    sort_order: int = 100


class BusinessAssetTypeCreateRequest(BusinessAssetTypeBase):
    pass


class BusinessAssetTypeUpdateRequest(BusinessAssetTypeBase):
    pass


class BusinessAssetTypeItemResponse(BusinessAssetTypeBase):
    id: int
    created_at: datetime
    updated_at: datetime


class BusinessAssetTypeMutationResponse(BusinessCoreResponseBase):
    data: BusinessAssetTypeItemResponse


class BusinessAssetTypesResponse(BusinessCoreResponseBase):
    total: int
    data: list[BusinessAssetTypeItemResponse]
