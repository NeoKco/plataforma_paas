from sqlalchemy.orm import Session

from app.apps.tenant_modules.maintenance.models import MaintenanceEquipmentType
from app.apps.tenant_modules.maintenance.repositories.catalog_repository import (
    MaintenanceCatalogRepository,
)


class MaintenanceEquipmentTypeRepository(
    MaintenanceCatalogRepository[MaintenanceEquipmentType]
):
    model_class = MaintenanceEquipmentType

    def get_by_code(
        self,
        tenant_db: Session,
        code: str,
    ) -> MaintenanceEquipmentType | None:
        return (
            tenant_db.query(MaintenanceEquipmentType)
            .filter(MaintenanceEquipmentType.code == code)
            .first()
        )
