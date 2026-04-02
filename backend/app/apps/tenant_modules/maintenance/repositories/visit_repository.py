from sqlalchemy.orm import Session

from app.apps.tenant_modules.maintenance.models import MaintenanceVisit


class MaintenanceVisitRepository:
    def list_filtered(
        self,
        tenant_db: Session,
        *,
        work_order_id: int | None = None,
        visit_status: str | None = None,
    ) -> list[MaintenanceVisit]:
        query = tenant_db.query(MaintenanceVisit)
        if work_order_id is not None:
            query = query.filter(MaintenanceVisit.work_order_id == work_order_id)
        if visit_status:
            query = query.filter(MaintenanceVisit.visit_status == visit_status)
        return query.order_by(
            MaintenanceVisit.scheduled_start_at.asc().nullslast(),
            MaintenanceVisit.id.asc(),
        ).all()

    def get_by_id(self, tenant_db: Session, visit_id: int) -> MaintenanceVisit | None:
        return (
            tenant_db.query(MaintenanceVisit)
            .filter(MaintenanceVisit.id == visit_id)
            .first()
        )

    def list_by_work_order(
        self,
        tenant_db: Session,
        work_order_id: int,
    ) -> list[MaintenanceVisit]:
        return (
            tenant_db.query(MaintenanceVisit)
            .filter(MaintenanceVisit.work_order_id == work_order_id)
            .order_by(
                MaintenanceVisit.scheduled_start_at.asc().nullslast(),
                MaintenanceVisit.id.asc(),
            )
            .all()
        )

    def save(self, tenant_db: Session, item: MaintenanceVisit) -> MaintenanceVisit:
        tenant_db.add(item)
        try:
            tenant_db.commit()
        except Exception:
            tenant_db.rollback()
            raise
        tenant_db.refresh(item)
        return item

    def delete(self, tenant_db: Session, item: MaintenanceVisit) -> None:
        tenant_db.delete(item)
        try:
            tenant_db.commit()
        except Exception:
            tenant_db.rollback()
            raise

    def count_by_work_order(self, tenant_db: Session, work_order_id: int) -> int:
        return (
            tenant_db.query(MaintenanceVisit)
            .filter(MaintenanceVisit.work_order_id == work_order_id)
            .count()
        )
