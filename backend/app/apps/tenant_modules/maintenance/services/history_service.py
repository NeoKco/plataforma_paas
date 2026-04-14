from sqlalchemy.orm import Session

from app.apps.tenant_modules.maintenance.models import (
    MaintenanceCostActual,
    MaintenanceWorkOrder,
)
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
        order_ids = [item.id for item in closed_orders]
        actuals_by_work_order_id = {}
        if order_ids:
            actuals = (
                tenant_db.query(MaintenanceCostActual)
                .filter(MaintenanceCostActual.work_order_id.in_(order_ids))
                .all()
            )
            actuals_by_work_order_id = {
                item.work_order_id: item
                for item in actuals
            }
        return [
            {
                "work_order": item,
                "finance_summary": self._build_finance_summary(
                    actuals_by_work_order_id.get(item.id)
                ),
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

    def _build_finance_summary(
        self,
        actual: MaintenanceCostActual | None,
    ) -> dict:
        if actual is None:
            return {
                "has_actual_cost": False,
                "is_synced_to_finance": False,
                "income_transaction_id": None,
                "expense_transaction_id": None,
                "finance_synced_at": None,
            }
        return {
            "has_actual_cost": True,
            "is_synced_to_finance": bool(
                actual.finance_synced_at
                or actual.income_transaction_id
                or actual.expense_transaction_id
            ),
            "income_transaction_id": actual.income_transaction_id,
            "expense_transaction_id": actual.expense_transaction_id,
            "finance_synced_at": actual.finance_synced_at,
        }
