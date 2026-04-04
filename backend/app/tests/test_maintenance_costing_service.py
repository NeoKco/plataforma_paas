import os
import unittest
from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import Mock

os.environ["DEBUG"] = "true"
os.environ["APP_ENV"] = "test"

from app.apps.tenant_modules.finance.models import FinanceCurrency  # noqa: E402
from app.apps.tenant_modules.maintenance.models import (  # noqa: E402
    MaintenanceCostActual,
    MaintenanceCostEstimate,
    MaintenanceCostLine,
    MaintenanceWorkOrder,
)
from app.apps.tenant_modules.maintenance.schemas import (  # noqa: E402
    MaintenanceCostActualWriteRequest,
    MaintenanceCostEstimateWriteRequest,
    MaintenanceFinanceSyncRequest,
)
from app.apps.tenant_modules.maintenance.services.costing_service import (  # noqa: E402
    MaintenanceCostingService,
)


class _FakeQuery:
    def __init__(self, target, mapping):
        self.target = target
        self.mapping = mapping

    def filter(self, *_args, **_kwargs):
        return self

    def first(self):
        return self.mapping.get(self.target)

    def all(self):
        value = self.mapping.get(self.target, [])
        if isinstance(value, list):
            return value
        return []


class _FakeTenantDb:
    def __init__(self, mapping):
        self.mapping = mapping
        self.added = []

    def query(self, target):
        return _FakeQuery(target, self.mapping)

    def add(self, item):
        self.added.append(item)
        if isinstance(item, MaintenanceCostEstimate):
            self.mapping[MaintenanceCostEstimate] = item
        if isinstance(item, MaintenanceCostActual):
            self.mapping[MaintenanceCostActual] = item
        if isinstance(item, MaintenanceCostLine):
            self.mapping.setdefault(MaintenanceCostLine, []).append(item)

    def delete(self, item):
        if isinstance(item, MaintenanceCostLine):
            self.mapping[MaintenanceCostLine] = [
                current
                for current in self.mapping.get(MaintenanceCostLine, [])
                if current is not item
            ]

    def commit(self):
        return None

    def refresh(self, _item):
        return None


class MaintenanceCostingServiceTestCase(unittest.TestCase):
    def test_upsert_cost_estimate_derives_total_and_suggested_price(self) -> None:
        work_order = SimpleNamespace(id=17, title="Mantención SST")
        tenant_db = _FakeTenantDb({MaintenanceWorkOrder: work_order})
        service = MaintenanceCostingService(finance_service=Mock())

        detail = service.upsert_cost_estimate(
            tenant_db,
            17,
            MaintenanceCostEstimateWriteRequest(
                labor_cost=10000,
                travel_cost=5000,
                materials_cost=3000,
                external_services_cost=2000,
                overhead_cost=1000,
                target_margin_percent=20,
                notes="Base preventiva",
            ),
            actor_user_id=8,
        )

        estimate = detail["estimate"]
        self.assertEqual(estimate.total_estimated_cost, 21000)
        self.assertEqual(estimate.suggested_price, 26250)
        self.assertEqual(estimate.target_margin_percent, 20)
        self.assertEqual(estimate.notes, "Base preventiva")
        self.assertEqual(estimate.created_by_user_id, 8)
        self.assertEqual(estimate.updated_by_user_id, 8)

    def test_upsert_cost_estimate_derives_summary_from_lines(self) -> None:
        work_order = SimpleNamespace(id=19, title="Mantención SST")
        tenant_db = _FakeTenantDb({MaintenanceWorkOrder: work_order, MaintenanceCostLine: []})
        service = MaintenanceCostingService(finance_service=Mock())

        detail = service.upsert_cost_estimate(
            tenant_db,
            19,
            MaintenanceCostEstimateWriteRequest(
                target_margin_percent=25,
                lines=[
                    {
                        "id": None,
                        "line_type": "labor",
                        "description": "Técnico 1",
                        "quantity": 2,
                        "unit_cost": 12000,
                        "notes": None,
                    },
                    {
                        "id": None,
                        "line_type": "travel",
                        "description": "Combustible",
                        "quantity": 1,
                        "unit_cost": 8000,
                        "notes": "Ruta sur",
                    },
                ],
            ),
            actor_user_id=4,
        )

        estimate = detail["estimate"]
        self.assertEqual(estimate.labor_cost, 24000)
        self.assertEqual(estimate.travel_cost, 8000)
        self.assertEqual(estimate.total_estimated_cost, 32000)
        self.assertEqual(estimate.suggested_price, 42666.67)
        self.assertEqual(len(detail["estimate_lines"]), 2)
        self.assertEqual(detail["estimate_lines"][0].cost_stage, "estimate")

    def test_upsert_cost_actual_derives_total_profit_and_margin(self) -> None:
        work_order = SimpleNamespace(id=22, title="Visita técnica")
        tenant_db = _FakeTenantDb({MaintenanceWorkOrder: work_order})
        service = MaintenanceCostingService(finance_service=Mock())

        detail = service.upsert_cost_actual(
            tenant_db,
            22,
            MaintenanceCostActualWriteRequest(
                labor_cost=15000,
                travel_cost=4000,
                materials_cost=1000,
                external_services_cost=0,
                overhead_cost=0,
                actual_price_charged=30000,
                notes="Costo real terreno",
            ),
            actor_user_id=3,
        )

        actual = detail["actual"]
        self.assertEqual(actual.total_actual_cost, 20000)
        self.assertEqual(actual.actual_income, 30000)
        self.assertEqual(actual.actual_profit, 10000)
        self.assertEqual(actual.actual_margin_percent, 33.33)
        self.assertEqual(actual.created_by_user_id, 3)
        self.assertEqual(actual.updated_by_user_id, 3)

    def test_upsert_cost_actual_derives_summary_from_lines(self) -> None:
        work_order = SimpleNamespace(id=28, title="Visita técnica")
        tenant_db = _FakeTenantDb({MaintenanceWorkOrder: work_order, MaintenanceCostLine: []})
        service = MaintenanceCostingService(finance_service=Mock())

        detail = service.upsert_cost_actual(
            tenant_db,
            28,
            MaintenanceCostActualWriteRequest(
                actual_price_charged=50000,
                lines=[
                    {
                        "id": None,
                        "line_type": "material",
                        "description": "Repuesto",
                        "quantity": 2,
                        "unit_cost": 7000,
                        "notes": None,
                    },
                    {
                        "id": None,
                        "line_type": "service",
                        "description": "Apoyo externo",
                        "quantity": 1,
                        "unit_cost": 9000,
                        "notes": None,
                    },
                ],
            ),
            actor_user_id=6,
        )

        actual = detail["actual"]
        self.assertEqual(actual.materials_cost, 14000)
        self.assertEqual(actual.external_services_cost, 9000)
        self.assertEqual(actual.total_actual_cost, 23000)
        self.assertEqual(actual.actual_profit, 27000)
        self.assertEqual(actual.actual_margin_percent, 54.0)
        self.assertEqual(len(detail["actual_lines"]), 2)
        self.assertEqual(detail["actual_lines"][0].cost_stage, "actual")

    def test_sync_to_finance_creates_income_and_expense_transactions(self) -> None:
        work_order = SimpleNamespace(
            id=31,
            title="Mantención semestral",
            completed_at=None,
            scheduled_for=datetime(2026, 4, 4, 15, 0, tzinfo=timezone.utc),
            requested_at=datetime(2026, 4, 1, 12, 0, tzinfo=timezone.utc),
        )
        actual = SimpleNamespace(
            id=6,
            work_order_id=31,
            total_actual_cost=18000,
            actual_price_charged=32000,
            actual_income=32000,
            actual_profit=14000,
            actual_margin_percent=43.75,
            notes="Cierre con cobro",
            income_transaction_id=None,
            expense_transaction_id=None,
            finance_synced_at=None,
            updated_by_user_id=None,
        )
        currency = SimpleNamespace(id=1)
        finance_service = Mock()
        finance_service.create_transaction.side_effect = [
            SimpleNamespace(id=501),
            SimpleNamespace(id=502),
        ]
        tenant_db = _FakeTenantDb(
            {
                MaintenanceWorkOrder: work_order,
                MaintenanceCostActual: actual,
                MaintenanceCostEstimate: None,
                FinanceCurrency: currency,
            }
        )
        service = MaintenanceCostingService(finance_service=finance_service)

        detail = service.sync_to_finance(
            tenant_db,
            31,
            MaintenanceFinanceSyncRequest(
                income_account_id=11,
                expense_account_id=12,
                income_category_id=21,
                expense_category_id=22,
                currency_id=1,
                notes="Sync manual",
            ),
            actor_user_id=9,
        )

        self.assertEqual(detail["actual"].income_transaction_id, 501)
        self.assertEqual(detail["actual"].expense_transaction_id, 502)
        self.assertIsNotNone(detail["actual"].finance_synced_at)
        self.assertEqual(detail["actual"].updated_by_user_id, 9)
        self.assertEqual(finance_service.create_transaction.call_count, 2)
        income_call = finance_service.create_transaction.call_args_list[0]
        expense_call = finance_service.create_transaction.call_args_list[1]
        self.assertEqual(income_call.kwargs["source_type"], "maintenance_work_order_income")
        self.assertEqual(income_call.kwargs["source_id"], 31)
        self.assertEqual(expense_call.kwargs["source_type"], "maintenance_work_order_expense")
        self.assertEqual(expense_call.kwargs["source_id"], 31)


if __name__ == "__main__":
    unittest.main()
