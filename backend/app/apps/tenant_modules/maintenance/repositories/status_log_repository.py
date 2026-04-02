from sqlalchemy.orm import Session

from app.apps.tenant_modules.maintenance.models import MaintenanceStatusLog


class MaintenanceStatusLogRepository:
    def create(
        self,
        tenant_db: Session,
        *,
        work_order_id: int,
        from_status: str | None,
        to_status: str,
        note: str | None,
        changed_by_user_id: int | None,
    ) -> MaintenanceStatusLog:
        log = MaintenanceStatusLog(
            work_order_id=work_order_id,
            from_status=from_status,
            to_status=to_status,
            note=note,
            changed_by_user_id=changed_by_user_id,
        )
        tenant_db.add(log)
        return log

    def count_by_work_order(self, tenant_db: Session, work_order_id: int) -> int:
        return (
            tenant_db.query(MaintenanceStatusLog)
            .filter(MaintenanceStatusLog.work_order_id == work_order_id)
            .count()
        )
