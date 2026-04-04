from app.apps.tenant_modules.maintenance.schemas.common import (
    MaintenanceResponseBase,
    MaintenanceStatusUpdateRequest,
)
from app.apps.tenant_modules.maintenance.schemas.due_item import (
    MaintenanceDueItemContactRequest,
    MaintenanceDueItemItemResponse,
    MaintenanceDueItemMutationResponse,
    MaintenanceDueItemPostponeRequest,
    MaintenanceDueItemScheduleRequest,
    MaintenanceDueItemScheduleResponse,
    MaintenanceDueItemsResponse,
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
from app.apps.tenant_modules.maintenance.schemas.schedule import (
    MaintenanceScheduleCreateRequest,
    MaintenanceScheduleItemResponse,
    MaintenanceScheduleMutationResponse,
    MaintenanceSchedulesResponse,
    MaintenanceScheduleStatusRequest,
    MaintenanceScheduleUpdateRequest,
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
    "MaintenanceDueItemContactRequest",
    "MaintenanceDueItemItemResponse",
    "MaintenanceDueItemMutationResponse",
    "MaintenanceDueItemPostponeRequest",
    "MaintenanceDueItemScheduleRequest",
    "MaintenanceDueItemScheduleResponse",
    "MaintenanceDueItemsResponse",
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
    "MaintenanceScheduleCreateRequest",
    "MaintenanceScheduleUpdateRequest",
    "MaintenanceScheduleStatusRequest",
    "MaintenanceScheduleItemResponse",
    "MaintenanceScheduleMutationResponse",
    "MaintenanceSchedulesResponse",
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
