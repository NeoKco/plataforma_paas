import os
import unittest
from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import Mock

os.environ["DEBUG"] = "true"
os.environ["APP_ENV"] = "test"

from app.apps.tenant_modules.maintenance.services.schedule_service import (  # noqa: E402
    MaintenanceScheduleService,
)


class MaintenanceScheduleServiceTestCase(unittest.TestCase):
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
