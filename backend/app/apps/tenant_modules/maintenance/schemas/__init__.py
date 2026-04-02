from app.apps.tenant_modules.maintenance.schemas.common import (
    MaintenanceResponseBase,
    MaintenanceStatusUpdateRequest,
)
from app.apps.tenant_modules.maintenance.schemas.equipment_type import (
    MaintenanceEquipmentTypeCreateRequest,
    MaintenanceEquipmentTypeItemResponse,
    MaintenanceEquipmentTypeMutationResponse,
    MaintenanceEquipmentTypesResponse,
    MaintenanceEquipmentTypeUpdateRequest,
)
from app.apps.tenant_modules.maintenance.schemas.history import (
    MaintenanceHistoryResponse,
    MaintenanceHistoryWorkOrderItemResponse,
    MaintenanceStatusLogItemResponse,
    MaintenanceStatusLogsResponse,
    MaintenanceVisitItemResponse,
    MaintenanceVisitsResponse,
)
from app.apps.tenant_modules.maintenance.schemas.installation import (
    MaintenanceInstallationCreateRequest,
    MaintenanceInstallationItemResponse,
    MaintenanceInstallationMutationResponse,
    MaintenanceInstallationsResponse,
    MaintenanceInstallationUpdateRequest,
)
from app.apps.tenant_modules.maintenance.schemas.work_order import (
    MaintenanceWorkOrderCreateRequest,
    MaintenanceWorkOrderItemResponse,
    MaintenanceWorkOrderMutationResponse,
    MaintenanceWorkOrdersResponse,
    MaintenanceWorkOrderUpdateRequest,
)
from app.apps.tenant_modules.maintenance.schemas.visit import (
    MaintenanceVisitCreateRequest,
    MaintenanceVisitMutationResponse,
    MaintenanceVisitUpdateRequest,
)

__all__ = [
    "MaintenanceResponseBase",
    "MaintenanceStatusUpdateRequest",
    "MaintenanceEquipmentTypeCreateRequest",
    "MaintenanceEquipmentTypeUpdateRequest",
    "MaintenanceEquipmentTypeItemResponse",
    "MaintenanceEquipmentTypeMutationResponse",
    "MaintenanceEquipmentTypesResponse",
    "MaintenanceInstallationCreateRequest",
    "MaintenanceInstallationUpdateRequest",
    "MaintenanceInstallationItemResponse",
    "MaintenanceInstallationMutationResponse",
    "MaintenanceInstallationsResponse",
    "MaintenanceWorkOrderCreateRequest",
    "MaintenanceWorkOrderUpdateRequest",
    "MaintenanceWorkOrderItemResponse",
    "MaintenanceWorkOrderMutationResponse",
    "MaintenanceWorkOrdersResponse",
    "MaintenanceVisitCreateRequest",
    "MaintenanceVisitUpdateRequest",
    "MaintenanceVisitMutationResponse",
    "MaintenanceStatusLogItemResponse",
    "MaintenanceVisitItemResponse",
    "MaintenanceHistoryWorkOrderItemResponse",
    "MaintenanceHistoryResponse",
    "MaintenanceStatusLogsResponse",
    "MaintenanceVisitsResponse",
]
