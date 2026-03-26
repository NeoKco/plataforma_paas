from datetime import datetime

from pydantic import BaseModel


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
