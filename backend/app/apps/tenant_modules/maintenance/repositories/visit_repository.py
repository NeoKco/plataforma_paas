from sqlalchemy.orm import Session

from app.apps.tenant_modules.maintenance.models import MaintenanceVisit


class MaintenanceVisitRepository:
    def count_by_work_order(self, tenant_db: Session, work_order_id: int) -> int:
        return (
            tenant_db.query(MaintenanceVisit)
            .filter(MaintenanceVisit.work_order_id == work_order_id)
            .count()
        )
