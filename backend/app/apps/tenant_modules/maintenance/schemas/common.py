from datetime import datetime

from pydantic import BaseModel

from app.apps.tenant_modules.core.schemas import TenantUserContextResponse


class MaintenanceResponseBase(BaseModel):
    success: bool
    message: str
    requested_by: TenantUserContextResponse


class MaintenanceStatusFinanceSyncRequest(BaseModel):
    sync_income: bool = True
    sync_expense: bool = True
    income_account_id: int | None = None
    expense_account_id: int | None = None
    income_category_id: int | None = None
    expense_category_id: int | None = None
    currency_id: int
    transaction_at: datetime | None = None
    income_description: str | None = None
    expense_description: str | None = None
    notes: str | None = None


class MaintenanceStatusUpdateRequest(BaseModel):
    maintenance_status: str
    note: str | None = None
    finance_sync: MaintenanceStatusFinanceSyncRequest | None = None
