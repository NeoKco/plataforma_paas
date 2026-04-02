from sqlalchemy.orm import Session

from app.apps.tenant_modules.maintenance.models import MaintenanceInstallation
from app.apps.tenant_modules.maintenance.repositories.catalog_repository import (
    MaintenanceCatalogRepository,
)


class MaintenanceInstallationRepository(
    MaintenanceCatalogRepository[MaintenanceInstallation]
):
    model_class = MaintenanceInstallation

    def list_filtered(
        self,
        tenant_db: Session,
        *,
        site_id: int | None = None,
        equipment_type_id: int | None = None,
        include_inactive: bool = True,
    ) -> list[MaintenanceInstallation]:
        query = tenant_db.query(MaintenanceInstallation)
        if site_id is not None:
            query = query.filter(MaintenanceInstallation.site_id == site_id)
        if equipment_type_id is not None:
            query = query.filter(MaintenanceInstallation.equipment_type_id == equipment_type_id)
        if not include_inactive:
            query = query.filter(MaintenanceInstallation.is_active.is_(True))
        return query.order_by(
            MaintenanceInstallation.sort_order.asc(),
            MaintenanceInstallation.id.asc(),
        ).all()
