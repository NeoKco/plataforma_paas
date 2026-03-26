from datetime import datetime

from pydantic import BaseModel


class FinanceCategoryBase(BaseModel):
    name: str
    category_type: str
    parent_category_id: int | None = None
    icon: str | None = None
    color: str | None = None
    note: str | None = None
    is_active: bool = True
    sort_order: int = 100


class FinanceCategoryCreateRequest(FinanceCategoryBase):
    pass


class FinanceCategoryUpdateRequest(FinanceCategoryBase):
    pass


class FinanceCategoryItemResponse(FinanceCategoryBase):
    id: int
    created_at: datetime
    updated_at: datetime
