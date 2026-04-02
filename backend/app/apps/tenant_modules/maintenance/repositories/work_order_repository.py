from sqlalchemy.orm import Session

from app.apps.tenant_modules.maintenance.models import MaintenanceWorkOrder


class MaintenanceWorkOrderRepository:
    def list_filtered(
        self,
        tenant_db: Session,
        *,
        client_id: int | None = None,
        site_id: int | None = None,
        maintenance_status: str | None = None,
    ) -> list[MaintenanceWorkOrder]:
        query = tenant_db.query(MaintenanceWorkOrder)
        if client_id is not None:
            query = query.filter(MaintenanceWorkOrder.client_id == client_id)
        if site_id is not None:
            query = query.filter(MaintenanceWorkOrder.site_id == site_id)
        if maintenance_status:
            query = query.filter(MaintenanceWorkOrder.maintenance_status == maintenance_status)
        return query.order_by(
            MaintenanceWorkOrder.scheduled_for.asc().nullslast(),
            MaintenanceWorkOrder.requested_at.desc(),
            MaintenanceWorkOrder.id.desc(),
        ).all()

    def get_by_id(self, tenant_db: Session, work_order_id: int) -> MaintenanceWorkOrder | None:
        return (
            tenant_db.query(MaintenanceWorkOrder)
            .filter(MaintenanceWorkOrder.id == work_order_id)
            .first()
        )

    def get_by_external_reference(
        self,
        tenant_db: Session,
        external_reference: str,
    ) -> MaintenanceWorkOrder | None:
        return (
            tenant_db.query(MaintenanceWorkOrder)
            .filter(MaintenanceWorkOrder.external_reference == external_reference)
            .first()
        )

    def save(self, tenant_db: Session, item: MaintenanceWorkOrder) -> MaintenanceWorkOrder:
        tenant_db.add(item)
        try:
            tenant_db.commit()
        except Exception:
            tenant_db.rollback()
            raise
        tenant_db.refresh(item)
        return item

    def delete(self, tenant_db: Session, item: MaintenanceWorkOrder) -> None:
        tenant_db.delete(item)
        try:
            tenant_db.commit()
        except Exception:
            tenant_db.rollback()
            raise
