import os
import unittest
from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import Mock

os.environ["DEBUG"] = "true"
os.environ["APP_ENV"] = "test"

from app.apps.tenant_modules.maintenance.schemas import MaintenanceScheduleCreateRequest  # noqa: E402
from app.apps.tenant_modules.maintenance.models import MaintenanceScheduleCostLine  # noqa: E402
from app.apps.tenant_modules.maintenance.services.schedule_service import (  # noqa: E402
    MaintenanceScheduleService,
)


class MaintenanceScheduleServiceTestCase(unittest.TestCase):
    def test_create_schedule_normalizes_naive_next_due_at_against_aware_history_date(self) -> None:
        tenant_db = Mock()
        empty_lines_query = Mock()
        empty_lines_query.filter.return_value = empty_lines_query
        empty_lines_query.order_by.return_value = empty_lines_query
        empty_lines_query.all.return_value = []
        tenant_db.query.side_effect = [
            Mock(filter=Mock(return_value=Mock(first=Mock(return_value=SimpleNamespace(id=17))))),
            Mock(filter=Mock(return_value=Mock(first=Mock(return_value=SimpleNamespace(id=31, client_id=17))))),
            Mock(filter=Mock(return_value=Mock(first=Mock(return_value=SimpleNamespace(id=9, site_id=31))))),
            empty_lines_query,
            empty_lines_query,
        ]
        tenant_db.add.return_value = None
        tenant_db.flush.return_value = None
        tenant_db.commit.return_value = None
        tenant_db.refresh.side_effect = lambda item: None

        schedule_repository = Mock()
        schedule_repository.find_equivalent_active.return_value = None

        service = MaintenanceScheduleService(schedule_repository=schedule_repository)

        created = service.create_schedule(
            tenant_db,
            MaintenanceScheduleCreateRequest(
                client_id=17,
                site_id=31,
                installation_id=9,
                task_type_id=None,
                name="Plan anual SST",
                description=None,
                frequency_value=1,
                frequency_unit="years",
                lead_days=30,
                start_mode="from_manual_due_date",
                base_date=None,
                last_executed_at=datetime(2026, 3, 3, 15, 0, tzinfo=timezone.utc),
                next_due_at=datetime(2027, 3, 3, 15, 0),
                default_priority="normal",
                estimated_duration_minutes=90,
                billing_mode="per_work_order",
                estimate_target_margin_percent=25,
                estimate_notes="Kit preventivo base",
                is_active=True,
                auto_create_due_items=True,
                notes=None,
                estimate_lines=[
                    {
                        "line_type": "material",
                        "description": "Filtro",
                        "quantity": 2,
                        "unit_cost": 3500,
                        "notes": None,
                    },
                    {
                        "line_type": "service",
                        "description": "Calibración externa",
                        "quantity": 1,
                        "unit_cost": 12000,
                        "notes": "Proveedor homologado",
                    },
                ],
            ),
            created_by_user_id=4,
        )

        self.assertEqual(created.last_executed_at.tzinfo, timezone.utc)
        self.assertEqual(created.next_due_at.tzinfo, timezone.utc)
        self.assertEqual(created.next_due_at.year, 2027)
        self.assertEqual(created.estimate_target_margin_percent, 25)
        self.assertEqual(created.estimate_notes, "Kit preventivo base")
        self.assertEqual(len(created.estimate_lines), 2)

    def test_suggest_schedule_seed_uses_completed_history_from_current_year(self) -> None:
        reference_completed_at = datetime(2026, 4, 3, 18, 30, tzinfo=timezone.utc)
        work_order_query = Mock()
        work_order_query.filter.return_value = work_order_query
        work_order_query.order_by.return_value = work_order_query
        work_order_query.first.return_value = SimpleNamespace(
            id=81,
            completed_at=reference_completed_at,
            scheduled_for=None,
            requested_at=reference_completed_at,
        )
        tenant_db = Mock()
        tenant_db.query.return_value = work_order_query

        service = MaintenanceScheduleService()

        suggestion = service.suggest_schedule_seed(
            tenant_db,
            client_id=17,
            site_id=31,
            installation_id=9,
        )

        self.assertEqual(suggestion["source"], "history_completed_this_year")
        self.assertEqual(suggestion["reference_work_order_id"], 81)
        self.assertEqual(suggestion["last_executed_at"], reference_completed_at)
        self.assertEqual(suggestion["suggested_frequency_value"], 1)
        self.assertEqual(suggestion["suggested_frequency_unit"], "years")
        self.assertEqual(suggestion["suggested_next_due_at"].year, 2027)
        self.assertEqual(suggestion["suggested_next_due_at"].month, 4)
        self.assertEqual(suggestion["suggested_next_due_at"].day, 3)

    def test_suggest_schedule_seed_falls_back_to_installation_baseline(self) -> None:
        installation_history_query = Mock()
        installation_history_query.filter.return_value = installation_history_query
        installation_history_query.order_by.return_value = installation_history_query
        installation_history_query.first.return_value = None

        site_history_query = Mock()
        site_history_query.filter.return_value = site_history_query
        site_history_query.order_by.return_value = site_history_query
        site_history_query.first.return_value = None

        installation_reference = datetime(2026, 1, 15, 15, 0, tzinfo=timezone.utc)
        installation_query = Mock()
        installation_query.filter.return_value = installation_query
        installation_query.first.return_value = SimpleNamespace(
            id=9,
            installed_at=None,
            last_service_at=installation_reference,
        )

        tenant_db = Mock()
        tenant_db.query.side_effect = [
            installation_history_query,
            site_history_query,
            installation_query,
        ]

        service = MaintenanceScheduleService()

        suggestion = service.suggest_schedule_seed(
            tenant_db,
            client_id=17,
            site_id=31,
            installation_id=9,
        )

        self.assertEqual(suggestion["source"], "installation_baseline")
        self.assertIsNone(suggestion["last_executed_at"])
        self.assertEqual(suggestion["suggested_frequency_value"], 6)
        self.assertEqual(suggestion["suggested_frequency_unit"], "months")
        self.assertEqual(suggestion["reference_completed_at"], installation_reference)
        self.assertEqual(suggestion["suggested_next_due_at"].year, 2026)
        self.assertEqual(suggestion["suggested_next_due_at"].month, 7)
        self.assertEqual(suggestion["suggested_next_due_at"].day, 15)

    def test_suggest_schedule_seed_falls_back_from_installation_to_site_history(self) -> None:
        empty_installation_history_query = Mock()
        empty_installation_history_query.filter.return_value = empty_installation_history_query
        empty_installation_history_query.order_by.return_value = empty_installation_history_query
        empty_installation_history_query.first.return_value = None

        site_reference_completed_at = datetime(2026, 2, 10, 9, 0, tzinfo=timezone.utc)
        site_history_query = Mock()
        site_history_query.filter.return_value = site_history_query
        site_history_query.order_by.return_value = site_history_query
        site_history_query.first.return_value = SimpleNamespace(
            id=77,
            completed_at=site_reference_completed_at,
            scheduled_for=None,
            requested_at=site_reference_completed_at,
        )

        tenant_db = Mock()
        tenant_db.query.side_effect = [empty_installation_history_query, site_history_query]

        service = MaintenanceScheduleService()

        suggestion = service.suggest_schedule_seed(
            tenant_db,
            client_id=17,
            site_id=31,
            installation_id=9,
        )

        self.assertEqual(suggestion["source"], "history_completed_this_year")
        self.assertEqual(suggestion["reference_work_order_id"], 77)
        self.assertEqual(suggestion["suggested_frequency_value"], 1)
        self.assertEqual(suggestion["suggested_frequency_unit"], "years")
        self.assertEqual(suggestion["suggested_next_due_at"].year, 2027)
        self.assertEqual(suggestion["suggested_next_due_at"].month, 2)
        self.assertEqual(suggestion["suggested_next_due_at"].day, 10)


if __name__ == "__main__":
    unittest.main()
