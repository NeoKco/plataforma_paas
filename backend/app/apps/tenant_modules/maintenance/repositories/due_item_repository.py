from datetime import datetime

from sqlalchemy.orm import Session

from app.apps.tenant_modules.maintenance.models import MaintenanceDueItem


class MaintenanceDueItemRepository:
    OPEN_DUE_ITEM_STATUSES = ("upcoming", "due", "contacted", "postponed")

    def list_filtered(
        self,
        tenant_db: Session,
        *,
        client_id: int | None = None,
        site_id: int | None = None,
        due_status: str | None = None,
        visible_only: bool = True,
        now: datetime | None = None,
    ) -> list[MaintenanceDueItem]:
        query = tenant_db.query(MaintenanceDueItem)
        if client_id is not None:
            query = query.filter(MaintenanceDueItem.client_id == client_id)
        if site_id is not None:
            query = query.filter(MaintenanceDueItem.site_id == site_id)
        if due_status:
            query = query.filter(MaintenanceDueItem.due_status == due_status)
        else:
            query = query.filter(MaintenanceDueItem.due_status.in_(self.OPEN_DUE_ITEM_STATUSES))
        if visible_only and now is not None:
            query = query.filter(MaintenanceDueItem.visible_from <= now)
        return query.order_by(
            MaintenanceDueItem.due_at.asc(),
            MaintenanceDueItem.id.asc(),
        ).all()

    def get_by_id(self, tenant_db: Session, due_item_id: int) -> MaintenanceDueItem | None:
        return (
            tenant_db.query(MaintenanceDueItem)
            .filter(MaintenanceDueItem.id == due_item_id)
            .first()
        )

    def get_open_for_cycle(
        self,
        tenant_db: Session,
        *,
        schedule_id: int,
        due_at: datetime,
    ) -> MaintenanceDueItem | None:
        return (
            tenant_db.query(MaintenanceDueItem)
            .filter(MaintenanceDueItem.schedule_id == schedule_id)
            .filter(MaintenanceDueItem.due_at == due_at)
            .filter(
                MaintenanceDueItem.due_status.in_(
                    ("upcoming", "due", "contacted", "postponed", "scheduled")
                )
            )
            .first()
        )

    def save(self, tenant_db: Session, item: MaintenanceDueItem) -> MaintenanceDueItem:
        tenant_db.add(item)
        try:
            tenant_db.commit()
        except Exception:
            tenant_db.rollback()
            raise
        tenant_db.refresh(item)
        return item
