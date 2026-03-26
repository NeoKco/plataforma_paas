from datetime import datetime

from pydantic import BaseModel

from app.apps.tenant_modules.finance.schemas.common import FinanceResponseBase


class FinanceSettingBase(BaseModel):
    setting_key: str
    setting_value: str
    is_active: bool = True


class FinanceSettingCreateRequest(FinanceSettingBase):
    pass


class FinanceSettingUpdateRequest(FinanceSettingBase):
    pass


class FinanceSettingItemResponse(FinanceSettingBase):
    id: int
    created_at: datetime
    updated_at: datetime


class FinanceSettingMutationResponse(FinanceResponseBase):
    data: FinanceSettingItemResponse


class FinanceSettingsResponse(FinanceResponseBase):
    total: int
    data: list[FinanceSettingItemResponse]
