from sqlalchemy.orm import Session

from app.apps.tenant_modules.maintenance.models import MaintenanceSchedule


class MaintenanceScheduleRepository:
    def list_filtered(
        self,
        tenant_db: Session,
        *,
        client_id: int | None = None,
        site_id: int | None = None,
        installation_id: int | None = None,
        include_inactive: bool = True,
    ) -> list[MaintenanceSchedule]:
        query = tenant_db.query(MaintenanceSchedule)
        if client_id is not None:
            query = query.filter(MaintenanceSchedule.client_id == client_id)
        if site_id is not None:
            query = query.filter(MaintenanceSchedule.site_id == site_id)
        if installation_id is not None:
            query = query.filter(MaintenanceSchedule.installation_id == installation_id)
        if not include_inactive:
            query = query.filter(MaintenanceSchedule.is_active.is_(True))
        return query.order_by(
            MaintenanceSchedule.next_due_at.asc(),
            MaintenanceSchedule.id.desc(),
        ).all()

    def list_active(self, tenant_db: Session) -> list[MaintenanceSchedule]:
        return (
            tenant_db.query(MaintenanceSchedule)
            .filter(MaintenanceSchedule.is_active.is_(True))
            .order_by(MaintenanceSchedule.next_due_at.asc(), MaintenanceSchedule.id.asc())
            .all()
        )

    def get_by_id(self, tenant_db: Session, schedule_id: int) -> MaintenanceSchedule | None:
        return (
            tenant_db.query(MaintenanceSchedule)
            .filter(MaintenanceSchedule.id == schedule_id)
            .first()
        )

    def find_equivalent_active(
        self,
        tenant_db: Session,
        *,
        client_id: int,
        site_id: int | None,
        installation_id: int | None,
        task_type_id: int | None,
        frequency_value: int,
        frequency_unit: str,
    ) -> MaintenanceSchedule | None:
        return (
            tenant_db.query(MaintenanceSchedule)
            .filter(MaintenanceSchedule.client_id == client_id)
            .filter(MaintenanceSchedule.site_id == site_id)
            .filter(MaintenanceSchedule.installation_id == installation_id)
            .filter(MaintenanceSchedule.task_type_id == task_type_id)
            .filter(MaintenanceSchedule.frequency_value == frequency_value)
            .filter(MaintenanceSchedule.frequency_unit == frequency_unit)
            .filter(MaintenanceSchedule.is_active.is_(True))
            .first()
        )

    def save(self, tenant_db: Session, item: MaintenanceSchedule) -> MaintenanceSchedule:
        tenant_db.add(item)
        try:
            tenant_db.commit()
        except Exception:
            tenant_db.rollback()
            raise
        tenant_db.refresh(item)
        return item
