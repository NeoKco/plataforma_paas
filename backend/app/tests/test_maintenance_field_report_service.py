import os
import tempfile
import unittest
from types import SimpleNamespace
from unittest.mock import Mock

os.environ["DEBUG"] = "true"
os.environ["APP_ENV"] = "test"

from app.apps.tenant_modules.maintenance.schemas import (  # noqa: E402
    MaintenanceFieldReportUpdateRequest,
)
from app.apps.tenant_modules.maintenance.services.field_report_service import (  # noqa: E402
    MaintenanceFieldReportService,
)
from app.common.config.settings import settings  # noqa: E402


class MaintenanceFieldReportServiceTestCase(unittest.TestCase):
    def test_get_field_report_returns_default_checklist_when_empty(self) -> None:
        work_order_query = Mock()
        work_order_query.filter.return_value = work_order_query
        work_order_query.first.return_value = SimpleNamespace(
            id=41,
            closure_notes="Cierre estándar",
        )
        checklist_query = Mock()
        checklist_query.filter.return_value = checklist_query
        checklist_query.order_by.return_value = checklist_query
        checklist_query.all.return_value = []
        evidence_query = Mock()
        evidence_query.filter.return_value = evidence_query
        evidence_query.order_by.return_value = evidence_query
        evidence_query.all.return_value = []
        tenant_db = Mock()
        tenant_db.query.side_effect = [work_order_query, checklist_query, evidence_query]

        service = MaintenanceFieldReportService()

        report = service.get_field_report(tenant_db, 41)

        self.assertEqual(report["work_order"].id, 41)
        self.assertEqual(report["closure_notes"], "Cierre estándar")
        self.assertEqual(len(report["checklist_items"]), 5)
        self.assertEqual(report["checklist_items"][0].item_key, "site_access")
        self.assertEqual(report["evidences"], [])

    def test_create_evidence_rejects_unsupported_type(self) -> None:
        work_order_query = Mock()
        work_order_query.filter.return_value = work_order_query
        work_order_query.first.return_value = SimpleNamespace(id=55)
        tenant_db = Mock()
        tenant_db.query.return_value = work_order_query

        service = MaintenanceFieldReportService()

        with self.assertRaisesRegex(ValueError, "no soportado"):
            service.create_evidence(
                tenant_db,
                55,
                file_name="evidence.exe",
                content_type="application/octet-stream",
                content_bytes=b"123",
            )

    def test_update_field_report_persists_checklist_and_notes(self) -> None:
        work_order = SimpleNamespace(id=63, closure_notes=None)
        work_order_query = Mock()
        work_order_query.filter.return_value = work_order_query
        work_order_query.first.return_value = work_order

        checklist_existing_query = Mock()
        checklist_existing_query.filter.return_value = checklist_existing_query
        checklist_existing_query.all.return_value = []

        checklist_read_query = Mock()
        checklist_read_query.filter.return_value = checklist_read_query
        checklist_read_query.order_by.return_value = checklist_read_query
        checklist_read_query.all.return_value = [
            SimpleNamespace(
                id=1,
                work_order_id=63,
                item_key="site_access",
                label="Acceso y condiciones del área",
                is_completed=True,
                notes="Conforme",
                sort_order=0,
                updated_by_user_id=9,
                created_at=None,
                updated_at=None,
            )
        ]

        evidence_query = Mock()
        evidence_query.filter.return_value = evidence_query
        evidence_query.order_by.return_value = evidence_query
        evidence_query.all.return_value = []

        tenant_db = Mock()
        tenant_db.query.side_effect = [
            work_order_query,
            checklist_existing_query,
            work_order_query,
            checklist_read_query,
            evidence_query,
        ]
        tenant_db.add.return_value = None
        tenant_db.flush.return_value = None
        tenant_db.commit.return_value = None
        tenant_db.refresh.side_effect = lambda item: None

        service = MaintenanceFieldReportService()

        report = service.update_field_report(
            tenant_db,
            63,
            MaintenanceFieldReportUpdateRequest(
                closure_notes="Equipo entregado operativo",
                checklist_items=[
                    {
                        "item_key": "site_access",
                        "label": "Acceso y condiciones del área",
                        "is_completed": True,
                        "notes": "Conforme",
                    }
                ],
            ),
            actor_user_id=9,
        )

        self.assertEqual(work_order.closure_notes, "Equipo entregado operativo")
        self.assertEqual(len(report["checklist_items"]), 1)
        self.assertEqual(report["checklist_items"][0].item_key, "site_access")


if __name__ == "__main__":
    unittest.main()