import os
import unittest
from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import Mock

os.environ["DEBUG"] = "true"
os.environ["APP_ENV"] = "test"

from app.apps.tenant_modules.finance.models import (  # noqa: E402
    FinanceAccount,
    FinanceCategory,
    FinanceCurrency,
)
from app.apps.tenant_modules.business_core.models import (  # noqa: E402
    BusinessClient,
    BusinessOrganization,
)
from app.apps.tenant_modules.maintenance.models import (  # noqa: E402
    MaintenanceCostActual,
    MaintenanceCostEstimate,
    MaintenanceCostLine,
    MaintenanceCostTemplate,
    MaintenanceSchedule,
    MaintenanceScheduleCostLine,
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

    def order_by(self, *_args, **_kwargs):
        return self

    def first(self):
        value = self.mapping.get(self.target)
        if isinstance(value, list):
            return value[0] if value else None
        return value

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

    def flush(self):
        return None

    def commit(self):
        return None

    def refresh(self, _item):
        return None


class MaintenanceCostingServiceTestCase(unittest.TestCase):
    def test_get_costing_detail_includes_linked_finance_transaction_snapshots(self) -> None:
        work_order = SimpleNamespace(id=41, title="Mantención SST")
        actual = MaintenanceCostActual(
            work_order_id=41,
            labor_cost=15000,
            travel_cost=5000,
            materials_cost=10000,
            external_services_cost=0,
            overhead_cost=0,
            total_actual_cost=30000,
            actual_price_charged=65000,
            actual_income=65000,
            actual_profit=35000,
            actual_margin_percent=53.85,
        )
        actual.income_transaction_id = 101
        actual.expense_transaction_id = 202
        income_transaction = SimpleNamespace(
            id=101,
            account_id=11,
            category_id=21,
            currency_id=31,
            transaction_at=datetime(2026, 4, 14, 10, 30, tzinfo=timezone.utc),
            description="Ingreso mantención #41 · SST · Cliente",
            notes="Cobro final",
        )
        expense_transaction = SimpleNamespace(
            id=202,
            account_id=12,
            category_id=22,
            currency_id=31,
            transaction_at=datetime(2026, 4, 14, 10, 30, tzinfo=timezone.utc),
            description="Egreso mantención #41 · SST · Cliente",
            notes="Costo operativo",
        )
        tenant_db = _FakeTenantDb(
            {
                MaintenanceWorkOrder: work_order,
                MaintenanceCostActual: actual,
                MaintenanceCostLine: [],
            }
        )
        service = MaintenanceCostingService(finance_service=Mock())
        service._get_finance_transaction = Mock(
            side_effect=[income_transaction, expense_transaction]
        )

        detail = service.get_costing_detail(tenant_db, 41)

        self.assertEqual(detail["income_transaction_snapshot"].id, 101)
        self.assertEqual(detail["expense_transaction_snapshot"].id, 202)
        self.assertEqual(detail["income_transaction_snapshot"].account_id, 11)
        self.assertEqual(detail["expense_transaction_snapshot"].category_id, 22)
        self.assertEqual(
            detail["income_transaction_snapshot"].description,
            "Ingreso mantención #41 · SST · Cliente",
        )

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

    def test_upsert_cost_actual_traces_applied_template(self) -> None:
        work_order = SimpleNamespace(id=29, title="Visita técnica")
        template = SimpleNamespace(id=4, name="Plantilla cierre estándar")
        tenant_db = _FakeTenantDb(
            {
                MaintenanceWorkOrder: work_order,
                MaintenanceCostTemplate: template,
                MaintenanceCostLine: [],
            }
        )
        service = MaintenanceCostingService(finance_service=Mock())

        detail = service.upsert_cost_actual(
            tenant_db,
            29,
            MaintenanceCostActualWriteRequest(
                labor_cost=10000,
                travel_cost=5000,
                actual_price_charged=25000,
                applied_template_id=4,
            ),
            actor_user_id=6,
        )

        actual = detail["actual"]
        self.assertEqual(actual.applied_cost_template_id, 4)
        self.assertEqual(actual.applied_cost_template_name_snapshot, "Plantilla cierre estándar")

    def test_sync_to_finance_creates_income_and_expense_transactions(self) -> None:
        work_order = SimpleNamespace(
            id=31,
            title="Mantención semestral",
            client_id=7,
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
                BusinessClient: SimpleNamespace(id=7, organization_id=12),
                BusinessOrganization: SimpleNamespace(id=12, name="Cliente Uno"),
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
        self.assertEqual(
            income_call.args[1].description,
            "Ingreso mantención #31 · Mantención semestral · Cliente Uno",
        )

    def test_maybe_auto_sync_by_tenant_policy_syncs_completed_work_order(self) -> None:
        work_order = SimpleNamespace(
            id=41,
            title="Mantención auto",
            maintenance_status="completed",
            completed_at=datetime(2026, 4, 4, 17, 0, tzinfo=timezone.utc),
            scheduled_for=datetime(2026, 4, 4, 15, 0, tzinfo=timezone.utc),
            requested_at=datetime(2026, 4, 1, 12, 0, tzinfo=timezone.utc),
        )
        actual = SimpleNamespace(
            id=8,
            work_order_id=41,
            total_actual_cost=20000,
            actual_price_charged=35000,
            actual_income=35000,
            actual_profit=15000,
            actual_margin_percent=42.86,
            notes="Auto",
            income_transaction_id=None,
            expense_transaction_id=None,
            finance_synced_at=None,
            updated_by_user_id=None,
        )
        currency = SimpleNamespace(id=1, is_base=True)
        finance_service = Mock()
        finance_service.create_transaction.side_effect = [
            SimpleNamespace(id=601),
            SimpleNamespace(id=602),
        ]
        tenant_db = _FakeTenantDb(
            {
                MaintenanceWorkOrder: work_order,
                MaintenanceCostActual: actual,
                MaintenanceCostEstimate: None,
                MaintenanceCostLine: [],
                FinanceCurrency: [currency],
                FinanceCategory: [
                    SimpleNamespace(id=21, name="Ventas", category_type="income", is_active=True, sort_order=10),
                    SimpleNamespace(id=22, name="Costos", category_type="expense", is_active=True, sort_order=10),
                ],
                FinanceAccount: [
                    SimpleNamespace(id=11, name="Caja", currency_id=1, is_active=True, is_favorite=False),
                    SimpleNamespace(id=12, name="Banco", currency_id=1, is_active=True, is_favorite=False),
                ],
            }
        )
        service = MaintenanceCostingService(finance_service=finance_service)
        service.tenant_data_service = SimpleNamespace(
            get_maintenance_finance_sync_policy=lambda _tenant_db: {
                "maintenance_finance_sync_mode": "auto_on_close",
                "maintenance_finance_auto_sync_income": True,
                "maintenance_finance_auto_sync_expense": True,
                "maintenance_finance_income_account_id": 11,
                "maintenance_finance_expense_account_id": 12,
                "maintenance_finance_income_category_id": 21,
                "maintenance_finance_expense_category_id": 22,
                "maintenance_finance_currency_id": None,
            }
        )

        detail = service.maybe_auto_sync_by_tenant_policy(
            tenant_db,
            41,
            actor_user_id=4,
        )

        self.assertIsNotNone(detail)
        self.assertEqual(actual.income_transaction_id, 601)
        self.assertEqual(actual.expense_transaction_id, 602)
        self.assertEqual(finance_service.create_transaction.call_count, 2)
        income_call = finance_service.create_transaction.call_args_list[0]
        expense_call = finance_service.create_transaction.call_args_list[1]
        self.assertEqual(income_call.args[1].account_id, 11)
        self.assertEqual(expense_call.args[1].account_id, 12)

    def test_get_finance_sync_defaults_prefers_effective_maintenance_defaults(self) -> None:
        currencies = [
            SimpleNamespace(id=1, code="USD", is_base=False, is_active=True),
            SimpleNamespace(id=2, code="CLP", is_base=True, is_active=True),
        ]
        categories = [
            SimpleNamespace(id=11, name="Ventas", category_type="income", is_active=True, sort_order=20),
            SimpleNamespace(
                id=12,
                name="Mantenciones y servicios",
                category_type="income",
                is_active=True,
                sort_order=10,
            ),
            SimpleNamespace(
                id=21,
                name="Costos de mantencion",
                category_type="expense",
                is_active=True,
                sort_order=10,
            ),
        ]
        accounts = [
            SimpleNamespace(id=31, name="Caja CLP", currency_id=2, is_active=True, is_favorite=True),
            SimpleNamespace(id=32, name="Caja USD", currency_id=1, is_active=True, is_favorite=False),
        ]
        tenant_db = _FakeTenantDb(
            {
                FinanceCurrency: currencies,
                FinanceCategory: categories,
                FinanceAccount: accounts,
            }
        )
        service = MaintenanceCostingService(finance_service=Mock())
        service.tenant_data_service = SimpleNamespace(
            get_maintenance_finance_sync_policy=lambda _tenant_db: {
                "maintenance_finance_sync_mode": "manual",
                "maintenance_finance_auto_sync_income": True,
                "maintenance_finance_auto_sync_expense": True,
                "maintenance_finance_income_account_id": None,
                "maintenance_finance_expense_account_id": None,
                "maintenance_finance_income_category_id": None,
                "maintenance_finance_expense_category_id": None,
                "maintenance_finance_currency_id": None,
            }
        )

        defaults = service.get_finance_sync_defaults(tenant_db)

        self.assertEqual(defaults["maintenance_finance_currency_id"], 2)
        self.assertEqual(defaults["maintenance_finance_currency_source"], "base")
        self.assertEqual(defaults["maintenance_finance_income_category_id"], 12)
        self.assertEqual(defaults["maintenance_finance_income_category_source"], "maintenance_default")
        self.assertEqual(defaults["maintenance_finance_expense_category_id"], 21)
        self.assertEqual(defaults["maintenance_finance_expense_category_source"], "maintenance_default")
        self.assertEqual(defaults["maintenance_finance_income_account_id"], 31)
        self.assertEqual(defaults["maintenance_finance_income_account_source"], "favorite")
        self.assertEqual(defaults["maintenance_finance_expense_account_id"], 31)
        self.assertEqual(defaults["maintenance_finance_expense_account_source"], "favorite")

    def test_get_finance_sync_defaults_respects_active_policy_values(self) -> None:
        currencies = [SimpleNamespace(id=2, code="CLP", is_base=True, is_active=True)]
        categories = [
            SimpleNamespace(
                id=12,
                name="Mantenciones y servicios",
                category_type="income",
                is_active=True,
                sort_order=10,
            ),
            SimpleNamespace(
                id=21,
                name="Costos de mantencion",
                category_type="expense",
                is_active=True,
                sort_order=10,
            ),
        ]
        accounts = [
            SimpleNamespace(id=31, name="Caja CLP", currency_id=2, is_active=True, is_favorite=False),
            SimpleNamespace(id=32, name="Banco CLP", currency_id=2, is_active=True, is_favorite=False),
        ]
        tenant_db = _FakeTenantDb(
            {
                FinanceCurrency: currencies,
                FinanceCategory: categories,
                FinanceAccount: accounts,
            }
        )
        service = MaintenanceCostingService(finance_service=Mock())
        service.tenant_data_service = SimpleNamespace(
            get_maintenance_finance_sync_policy=lambda _tenant_db: {
                "maintenance_finance_sync_mode": "auto_on_close",
                "maintenance_finance_auto_sync_income": True,
                "maintenance_finance_auto_sync_expense": False,
                "maintenance_finance_income_account_id": 32,
                "maintenance_finance_expense_account_id": 31,
                "maintenance_finance_income_category_id": 12,
                "maintenance_finance_expense_category_id": 21,
                "maintenance_finance_currency_id": 2,
            }
        )

        defaults = service.get_finance_sync_defaults(tenant_db)

        self.assertEqual(defaults["maintenance_finance_sync_mode"], "auto_on_close")
        self.assertEqual(defaults["maintenance_finance_currency_id"], 2)
        self.assertEqual(defaults["maintenance_finance_currency_source"], "policy")
        self.assertEqual(defaults["maintenance_finance_income_account_id"], 32)
        self.assertEqual(defaults["maintenance_finance_income_account_source"], "policy")
        self.assertEqual(defaults["maintenance_finance_expense_account_id"], 31)
        self.assertEqual(defaults["maintenance_finance_expense_account_source"], "policy")
        self.assertEqual(defaults["maintenance_finance_income_category_id"], 12)
        self.assertEqual(defaults["maintenance_finance_income_category_source"], "policy")
        self.assertEqual(defaults["maintenance_finance_expense_category_id"], 21)
        self.assertEqual(defaults["maintenance_finance_expense_category_source"], "policy")

    def test_get_finance_sync_defaults_falls_back_to_first_active_account(self) -> None:
        currencies = [SimpleNamespace(id=2, code="CLP", is_base=True, is_active=True)]
        categories = [
            SimpleNamespace(
                id=12,
                name="Mantenciones y servicios",
                category_type="income",
                is_active=True,
                sort_order=10,
            ),
            SimpleNamespace(
                id=21,
                name="Costos de mantencion",
                category_type="expense",
                is_active=True,
                sort_order=10,
            ),
        ]
        accounts = [
            SimpleNamespace(id=32, name="Banco CLP", currency_id=2, is_active=True, is_favorite=False),
            SimpleNamespace(id=31, name="Caja CLP", currency_id=2, is_active=True, is_favorite=False),
        ]
        tenant_db = _FakeTenantDb(
            {
                FinanceCurrency: currencies,
                FinanceCategory: categories,
                FinanceAccount: accounts,
            }
        )
        service = MaintenanceCostingService(finance_service=Mock())
        service.tenant_data_service = SimpleNamespace(
            get_maintenance_finance_sync_policy=lambda _tenant_db: {
                "maintenance_finance_sync_mode": "manual",
                "maintenance_finance_auto_sync_income": True,
                "maintenance_finance_auto_sync_expense": True,
                "maintenance_finance_income_account_id": None,
                "maintenance_finance_expense_account_id": None,
                "maintenance_finance_income_category_id": None,
                "maintenance_finance_expense_category_id": None,
                "maintenance_finance_currency_id": None,
            }
        )

        defaults = service.get_finance_sync_defaults(tenant_db)

        self.assertEqual(defaults["maintenance_finance_income_account_id"], 31)
        self.assertEqual(defaults["maintenance_finance_income_account_source"], "first_active")
        self.assertEqual(defaults["maintenance_finance_expense_account_id"], 31)
        self.assertEqual(defaults["maintenance_finance_expense_account_source"], "first_active")

    def test_maybe_auto_sync_uses_effective_defaults_when_policy_accounts_are_empty(self) -> None:
        work_order = SimpleNamespace(
            id=42,
            title="Mantención auto",
            maintenance_status="completed",
            completed_at=datetime(2026, 4, 4, 17, 0, tzinfo=timezone.utc),
            scheduled_for=datetime(2026, 4, 4, 15, 0, tzinfo=timezone.utc),
            requested_at=datetime(2026, 4, 1, 12, 0, tzinfo=timezone.utc),
            client_id=None,
        )
        actual = SimpleNamespace(
            id=9,
            work_order_id=42,
            total_actual_cost=22000,
            actual_price_charged=36000,
            actual_income=36000,
            actual_profit=14000,
            actual_margin_percent=38.89,
            notes="Auto defaults",
            income_transaction_id=None,
            expense_transaction_id=None,
            finance_synced_at=None,
            updated_by_user_id=None,
        )
        currencies = [SimpleNamespace(id=2, code="CLP", is_base=True, is_active=True)]
        categories = [
            SimpleNamespace(
                id=12,
                name="Mantenciones y servicios",
                category_type="income",
                is_active=True,
                sort_order=10,
            ),
            SimpleNamespace(
                id=21,
                name="Costos de mantencion",
                category_type="expense",
                is_active=True,
                sort_order=10,
            ),
        ]
        accounts = [
            SimpleNamespace(id=31, name="Caja CLP", currency_id=2, is_active=True, is_favorite=False),
            SimpleNamespace(id=32, name="Banco CLP", currency_id=2, is_active=True, is_favorite=False),
        ]
        finance_service = Mock()
        finance_service.create_transaction.side_effect = [
            SimpleNamespace(id=701),
            SimpleNamespace(id=702),
        ]
        tenant_db = _FakeTenantDb(
            {
                MaintenanceWorkOrder: work_order,
                MaintenanceCostActual: actual,
                MaintenanceCostEstimate: None,
                MaintenanceCostLine: [],
                FinanceCurrency: currencies,
                FinanceCategory: categories,
                FinanceAccount: accounts,
            }
        )
        service = MaintenanceCostingService(finance_service=finance_service)
        service.tenant_data_service = SimpleNamespace(
            get_maintenance_finance_sync_policy=lambda _tenant_db: {
                "maintenance_finance_sync_mode": "auto_on_close",
                "maintenance_finance_auto_sync_income": True,
                "maintenance_finance_auto_sync_expense": True,
                "maintenance_finance_income_account_id": None,
                "maintenance_finance_expense_account_id": None,
                "maintenance_finance_income_category_id": None,
                "maintenance_finance_expense_category_id": None,
                "maintenance_finance_currency_id": None,
            }
        )

        detail = service.maybe_auto_sync_by_tenant_policy(tenant_db, 42, actor_user_id=5)

        self.assertIsNotNone(detail)
        income_call = finance_service.create_transaction.call_args_list[0]
        expense_call = finance_service.create_transaction.call_args_list[1]
        self.assertEqual(income_call.args[1].account_id, 31)
        self.assertEqual(expense_call.args[1].account_id, 31)
        self.assertEqual(income_call.args[1].category_id, 12)
        self.assertEqual(expense_call.args[1].category_id, 21)


    def test_seed_estimate_from_schedule_copies_default_lines(self) -> None:
        work_order = SimpleNamespace(id=51, title="Mantención programada")
        schedule = SimpleNamespace(
            id=14,
            estimate_target_margin_percent=15,
            estimate_notes="Base preventiva anual",
        )
        schedule_lines = [
            SimpleNamespace(
                id=1,
                schedule_id=14,
                line_type="material",
                description="Kit filtro",
                quantity=2,
                unit_cost=4500,
                notes=None,
                sort_order=0,
            ),
            SimpleNamespace(
                id=2,
                schedule_id=14,
                line_type="service",
                description="Calibración externa",
                quantity=1,
                unit_cost=12000,
                notes="Proveedor homologado",
                sort_order=1,
            ),
        ]
        tenant_db = _FakeTenantDb(
            {
                MaintenanceWorkOrder: work_order,
                MaintenanceSchedule: schedule,
                MaintenanceScheduleCostLine: schedule_lines,
                MaintenanceCostLine: [],
            }
        )
        service = MaintenanceCostingService(finance_service=Mock())

        detail = service.seed_estimate_from_schedule(
            tenant_db,
            51,
            14,
            actor_user_id=6,
        )

        self.assertIsNotNone(detail)
        estimate = detail["estimate"]
        self.assertEqual(estimate.materials_cost, 9000)
        self.assertEqual(estimate.external_services_cost, 12000)
        self.assertEqual(estimate.total_estimated_cost, 21000)
        self.assertEqual(estimate.target_margin_percent, 15)
        self.assertEqual(estimate.notes, "Base preventiva anual")
        self.assertEqual(len(detail["estimate_lines"]), 2)

    def test_sync_to_finance_uses_custom_description_and_date(self) -> None:
        work_order = SimpleNamespace(id=31, title="Mantención anual", completed_at=None)
        actual = MaintenanceCostActual(
            work_order_id=31,
            labor_cost=0,
            travel_cost=0,
            materials_cost=0,
            external_services_cost=0,
            overhead_cost=0,
            total_actual_cost=0,
            actual_price_charged=18000,
            actual_income=18000,
            actual_profit=6000,
            actual_margin_percent=33.33,
        )
        currency = SimpleNamespace(id=3)
        tenant_db = _FakeTenantDb(
            {
                MaintenanceWorkOrder: work_order,
                MaintenanceCostActual: actual,
                FinanceCurrency: currency,
            }
        )
        finance_service = Mock()
        finance_service.create_transaction.return_value = SimpleNamespace(id=77)
        service = MaintenanceCostingService(finance_service=finance_service)
        custom_date = datetime(2026, 4, 12, 9, 0, tzinfo=timezone.utc)

        payload = MaintenanceFinanceSyncRequest(
            sync_income=True,
            sync_expense=False,
            income_account_id=10,
            expense_account_id=None,
            income_category_id=None,
            expense_category_id=None,
            currency_id=3,
            transaction_at=custom_date,
            income_description="Ingreso mantención custom",
            notes="nota",
        )

        service.sync_to_finance(tenant_db, 31, payload, actor_user_id=5)

        self.assertTrue(finance_service.create_transaction.called)
        args, _kwargs = finance_service.create_transaction.call_args
        created_payload = args[1]
        self.assertEqual(created_payload.description, "Ingreso mantención custom")
        self.assertEqual(created_payload.transaction_at, custom_date)


if __name__ == "__main__":
    unittest.main()
