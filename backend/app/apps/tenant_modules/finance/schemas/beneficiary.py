from datetime import datetime

from pydantic import BaseModel


class FinanceBeneficiaryBase(BaseModel):
    name: str
    icon: str | None = None
    note: str | None = None
    is_active: bool = True
    sort_order: int = 100


class FinanceBeneficiaryCreateRequest(FinanceBeneficiaryBase):
    pass


class FinanceBeneficiaryUpdateRequest(FinanceBeneficiaryBase):
    pass


class FinanceBeneficiaryItemResponse(FinanceBeneficiaryBase):
    id: int
    created_at: datetime
    updated_at: datetime
