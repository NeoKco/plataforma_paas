from datetime import timedelta

from sqlalchemy import or_
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
            MaintenanceWorkOrder.scheduled_for.desc().nullslast(),
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

    def list_active_conflicts(
        self,
        tenant_db: Session,
        *,
        scheduled_for,
        installation_id: int | None = None,
        assigned_work_group_id: int | None = None,
        assigned_tenant_user_id: int | None = None,
        exclude_work_order_id: int | None = None,
    ) -> list[MaintenanceWorkOrder]:
        if scheduled_for is None:
            return []

        minute_start = scheduled_for.replace(second=0, microsecond=0)
        minute_end = minute_start + timedelta(minutes=1)
        resource_filters = []

        if installation_id is not None:
            resource_filters.append(MaintenanceWorkOrder.installation_id == installation_id)
        if assigned_work_group_id is not None:
            resource_filters.append(
                MaintenanceWorkOrder.assigned_work_group_id == assigned_work_group_id
            )
        if assigned_tenant_user_id is not None:
            resource_filters.append(
                MaintenanceWorkOrder.assigned_tenant_user_id == assigned_tenant_user_id
            )

        if not resource_filters:
            return []

        query = tenant_db.query(MaintenanceWorkOrder).filter(
            MaintenanceWorkOrder.maintenance_status.in_(("scheduled", "in_progress")),
            MaintenanceWorkOrder.scheduled_for.isnot(None),
            MaintenanceWorkOrder.scheduled_for >= minute_start,
            MaintenanceWorkOrder.scheduled_for < minute_end,
            or_(*resource_filters),
        )

        if exclude_work_order_id is not None:
            query = query.filter(MaintenanceWorkOrder.id != exclude_work_order_id)

        return query.order_by(
            MaintenanceWorkOrder.scheduled_for.asc(),
            MaintenanceWorkOrder.id.asc(),
        ).all()

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
