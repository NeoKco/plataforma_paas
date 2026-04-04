from sqlalchemy.orm import Session

from app.apps.tenant_modules.maintenance.models import MaintenanceWorkOrder
from app.apps.tenant_modules.maintenance.repositories import (
    MaintenanceStatusLogRepository,
    MaintenanceVisitRepository,
    MaintenanceWorkOrderRepository,
)

FINAL_HISTORY_STATUSES = {"completed", "cancelled"}


class MaintenanceHistoryService:
    def __init__(
        self,
        work_order_repository: MaintenanceWorkOrderRepository | None = None,
        status_log_repository: MaintenanceStatusLogRepository | None = None,
        visit_repository: MaintenanceVisitRepository | None = None,
    ) -> None:
        self.work_order_repository = work_order_repository or MaintenanceWorkOrderRepository()
        self.status_log_repository = status_log_repository or MaintenanceStatusLogRepository()
        self.visit_repository = visit_repository or MaintenanceVisitRepository()

    def list_history(
        self,
        tenant_db: Session,
        *,
        client_id: int | None = None,
        site_id: int | None = None,
    ) -> list[dict]:
        closed_orders = [
            item
            for item in self.work_order_repository.list_filtered(
                tenant_db,
                client_id=client_id,
                site_id=site_id,
                maintenance_status=None,
            )
            if item.maintenance_status in FINAL_HISTORY_STATUSES
        ]
        closed_orders.sort(
            key=lambda item: item.completed_at or item.cancelled_at or item.updated_at,
            reverse=True,
        )
        return [
            {
                "work_order": item,
                "status_logs": self.status_log_repository.list_by_work_order(tenant_db, item.id),
                "visits": self.visit_repository.list_by_work_order(tenant_db, item.id),
            }
            for item in closed_orders
        ]

    def list_status_logs(
        self,
        tenant_db: Session,
        work_order_id: int,
    ) -> list:
        self._ensure_work_order_exists(tenant_db, work_order_id)
        return self.status_log_repository.list_by_work_order(tenant_db, work_order_id)

    def list_visits(
        self,
        tenant_db: Session,
        work_order_id: int,
    ) -> list:
        self._ensure_work_order_exists(tenant_db, work_order_id)
        return self.visit_repository.list_by_work_order(tenant_db, work_order_id)

    def _ensure_work_order_exists(self, tenant_db: Session, work_order_id: int) -> MaintenanceWorkOrder:
        item = self.work_order_repository.get_by_id(tenant_db, work_order_id)
        if item is None:
            raise ValueError("La mantencion solicitada no existe")
        return item
