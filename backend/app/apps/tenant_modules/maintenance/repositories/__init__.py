from app.apps.tenant_modules.maintenance.repositories.catalog_repository import (
    MaintenanceCatalogRepository,
)
from app.apps.tenant_modules.maintenance.repositories.equipment_type_repository import (
    MaintenanceEquipmentTypeRepository,
)
from app.apps.tenant_modules.maintenance.repositories.installation_repository import (
    MaintenanceInstallationRepository,
)
from app.apps.tenant_modules.maintenance.repositories.status_log_repository import (
    MaintenanceStatusLogRepository,
)
from app.apps.tenant_modules.maintenance.repositories.visit_repository import (
    MaintenanceVisitRepository,
)
from app.apps.tenant_modules.maintenance.repositories.work_order_repository import (
    MaintenanceWorkOrderRepository,
)

__all__ = [
    "MaintenanceCatalogRepository",
    "MaintenanceEquipmentTypeRepository",
    "MaintenanceInstallationRepository",
    "MaintenanceWorkOrderRepository",
    "MaintenanceStatusLogRepository",
    "MaintenanceVisitRepository",
]
