from datetime import datetime

from pydantic import BaseModel

from app.apps.tenant_modules.maintenance.schemas.common import MaintenanceResponseBase


class MaintenanceEquipmentTypeBase(BaseModel):
    code: str | None = None
    name: str
    description: str | None = None
    is_active: bool = True
    sort_order: int = 100


class MaintenanceEquipmentTypeCreateRequest(MaintenanceEquipmentTypeBase):
    pass


class MaintenanceEquipmentTypeUpdateRequest(MaintenanceEquipmentTypeBase):
    pass


class MaintenanceEquipmentTypeItemResponse(MaintenanceEquipmentTypeBase):
    id: int
    created_at: datetime
    updated_at: datetime


class MaintenanceEquipmentTypeMutationResponse(MaintenanceResponseBase):
    data: MaintenanceEquipmentTypeItemResponse


class MaintenanceEquipmentTypesResponse(MaintenanceResponseBase):
    total: int
    data: list[MaintenanceEquipmentTypeItemResponse]
