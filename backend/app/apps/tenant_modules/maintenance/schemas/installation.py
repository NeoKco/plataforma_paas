from datetime import datetime

from pydantic import BaseModel

from app.apps.tenant_modules.maintenance.schemas.common import MaintenanceResponseBase


class MaintenanceInstallationBase(BaseModel):
    site_id: int
    equipment_type_id: int
    name: str
    serial_number: str | None = None
    manufacturer: str | None = None
    model: str | None = None
    installed_at: datetime | None = None
    last_service_at: datetime | None = None
    warranty_until: datetime | None = None
    installation_status: str = "active"
    location_note: str | None = None
    technical_notes: str | None = None
    is_active: bool = True
    sort_order: int = 100


class MaintenanceInstallationCreateRequest(MaintenanceInstallationBase):
    pass


class MaintenanceInstallationUpdateRequest(MaintenanceInstallationBase):
    pass


class MaintenanceInstallationItemResponse(MaintenanceInstallationBase):
    id: int
    created_at: datetime
    updated_at: datetime


class MaintenanceInstallationMutationResponse(MaintenanceResponseBase):
    data: MaintenanceInstallationItemResponse


class MaintenanceInstallationsResponse(MaintenanceResponseBase):
    total: int
    data: list[MaintenanceInstallationItemResponse]
