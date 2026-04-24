import os
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock, patch

os.environ["DEBUG"] = "true"
os.environ["APP_ENV"] = "test"

from app.apps.tenant_modules.business_core.models import (  # noqa: E402
    BusinessClient,
    BusinessSite,
)
from app.apps.tenant_modules.core.models.user import User  # noqa: E402
from app.apps.tenant_modules.crm.models import CRMOpportunity  # noqa: E402
from app.apps.tenant_modules.maintenance.models import (  # noqa: E402
    MaintenanceInstallation,
    MaintenanceWorkOrder,
)
from app.apps.tenant_modules.taskops.models import TaskOpsTask  # noqa: E402
from app.apps.tenant_modules.techdocs.models import (  # noqa: E402
    TechDocsAuditEvent,
    TechDocsDossier,
    TechDocsEvidence,
    TechDocsMeasurement,
    TechDocsSection,
)
from app.apps.tenant_modules.techdocs.schemas import (  # noqa: E402
    TechDocsDossierCreateRequest,
    TechDocsMeasurementWriteRequest,
    TechDocsSectionWriteRequest,
)
from app.apps.tenant_modules.techdocs.services.dossier_service import (  # noqa: E402
    TechDocsDossierService,
)


class TechDocsServicesTestCase(unittest.TestCase):
    def test_dossier_rejects_invalid_type(self) -> None:
        service = TechDocsDossierService()

        with self.assertRaises(ValueError) as exc:
            service.create_dossier(
                Mock(),
                TechDocsDossierCreateRequest(
                    client_id=None,
                    site_id=None,
                    installation_id=None,
                    opportunity_id=None,
                    work_order_id=None,
                    task_id=None,
                    owner_user_id=None,
                    title="Dossier inválido",
                    dossier_type="electrical_only",
                    status="draft",
                    summary=None,
                    objective=None,
                    scope_notes=None,
                    technical_notes=None,
                    is_active=True,
                ),
            )

        self.assertIn("Tipo de expediente inválido", str(exc.exception))

    def test_create_dossier_persists_audit(self) -> None:
        tenant_db = Mock()
        tenant_db.get.side_effect = lambda model, item_id: (
            SimpleNamespace(id=item_id)
            if (
                (model is BusinessClient and item_id == 7)
                or (model is BusinessSite and item_id == 8)
                or (model is MaintenanceInstallation and item_id == 9)
                or (model is CRMOpportunity and item_id == 10)
                or (model is MaintenanceWorkOrder and item_id == 11)
                or (model is TaskOpsTask and item_id == 12)
                or (model is User and item_id == 3)
            )
            else None
        )

        added_items: list[object] = []

        def add_side_effect(item) -> None:
            added_items.append(item)

        def flush_side_effect() -> None:
            for item in added_items:
                if isinstance(item, TechDocsDossier) and getattr(item, "id", None) is None:
                    item.id = 55

        tenant_db.add.side_effect = add_side_effect
        tenant_db.flush.side_effect = flush_side_effect
        tenant_db.commit.return_value = None
        tenant_db.refresh.return_value = None

        service = TechDocsDossierService()
        created = service.create_dossier(
            tenant_db,
            TechDocsDossierCreateRequest(
                client_id=7,
                site_id=8,
                installation_id=9,
                opportunity_id=10,
                work_order_id=11,
                task_id=12,
                owner_user_id=3,
                title="Dossier técnico base",
                dossier_type="installation",
                status="draft",
                summary="Resumen",
                objective="Objetivo",
                scope_notes="Alcance",
                technical_notes="Notas",
                is_active=True,
            ),
            actor_user_id=3,
        )

        audit_rows = [item for item in added_items if isinstance(item, TechDocsAuditEvent)]
        self.assertEqual(created.id, 55)
        self.assertEqual(created.client_id, 7)
        self.assertEqual(created.installation_id, 9)
        self.assertEqual(len(audit_rows), 1)
        self.assertEqual(audit_rows[0].dossier_id, 55)
        self.assertEqual(audit_rows[0].event_type, "created")

    def test_create_measurement_persists_audit(self) -> None:
        dossier = TechDocsDossier(
            id=20,
            client_id=None,
            site_id=None,
            installation_id=None,
            opportunity_id=None,
            work_order_id=None,
            task_id=None,
            owner_user_id=None,
            title="Dossier",
            dossier_type="custom",
            status="draft",
            summary=None,
            objective=None,
            scope_notes=None,
            technical_notes=None,
            version=1,
            approved_by_user_id=None,
            approved_at=None,
            is_active=True,
            created_by_user_id=None,
            updated_by_user_id=None,
        )
        section = TechDocsSection(
            id=30,
            dossier_id=20,
            section_kind="inspection",
            title="Inspección",
            notes=None,
            sort_order=100,
        )

        tenant_db = Mock()
        tenant_db.get.side_effect = lambda model, item_id: (
            dossier
            if model is TechDocsDossier and item_id == 20
            else section
            if model is TechDocsSection and item_id == 30
            else None
        )

        added_items: list[object] = []

        def add_side_effect(item) -> None:
            added_items.append(item)

        def flush_side_effect() -> None:
            for item in added_items:
                if isinstance(item, TechDocsMeasurement) and getattr(item, "id", None) is None:
                    item.id = 70

        tenant_db.add.side_effect = add_side_effect
        tenant_db.flush.side_effect = flush_side_effect
        tenant_db.commit.return_value = None
        tenant_db.refresh.return_value = None

        service = TechDocsDossierService()
        created = service.create_measurement(
            tenant_db,
            30,
            TechDocsMeasurementWriteRequest(
                label="Voltaje",
                measured_value="220",
                unit="V",
                expected_range="210-230",
                notes="Estable",
                sort_order=20,
            ),
            actor_user_id=3,
        )

        audit_rows = [item for item in added_items if isinstance(item, TechDocsAuditEvent)]
        self.assertEqual(created.id, 70)
        self.assertEqual(created.section_id, 30)
        self.assertEqual(len(audit_rows), 1)
        self.assertEqual(audit_rows[0].event_type, "measurement_created")

    def test_evidence_rejects_unsupported_content_type(self) -> None:
        dossier = TechDocsDossier(
            id=20,
            client_id=None,
            site_id=None,
            installation_id=None,
            opportunity_id=None,
            work_order_id=None,
            task_id=None,
            owner_user_id=None,
            title="Dossier",
            dossier_type="custom",
            status="draft",
            summary=None,
            objective=None,
            scope_notes=None,
            technical_notes=None,
            version=1,
            approved_by_user_id=None,
            approved_at=None,
            is_active=True,
            created_by_user_id=None,
            updated_by_user_id=None,
        )
        tenant_db = Mock()
        tenant_db.get.side_effect = lambda model, item_id: dossier if model is TechDocsDossier and item_id == 20 else None

        service = TechDocsDossierService()
        with self.assertRaises(ValueError) as exc:
            service.add_evidence(
                tenant_db,
                20,
                file_name="payload.exe",
                content_type="application/x-msdownload",
                content_bytes=b"abc",
                evidence_kind="support",
                description=None,
                actor_user_id=1,
            )

        self.assertIn("Tipo de archivo no soportado", str(exc.exception))

    def test_evidence_create_persists_file_and_audit(self) -> None:
        dossier = TechDocsDossier(
            id=20,
            client_id=None,
            site_id=None,
            installation_id=None,
            opportunity_id=None,
            work_order_id=None,
            task_id=None,
            owner_user_id=None,
            title="Dossier",
            dossier_type="custom",
            status="draft",
            summary=None,
            objective=None,
            scope_notes=None,
            technical_notes=None,
            version=1,
            approved_by_user_id=None,
            approved_at=None,
            is_active=True,
            created_by_user_id=None,
            updated_by_user_id=None,
        )
        tenant_db = Mock()
        tenant_db.get.side_effect = lambda model, item_id: dossier if model is TechDocsDossier and item_id == 20 else None

        added_items: list[object] = []

        def add_side_effect(item) -> None:
            added_items.append(item)

        def flush_side_effect() -> None:
            for item in added_items:
                if isinstance(item, TechDocsEvidence) and getattr(item, "id", None) is None:
                    item.id = 81

        tenant_db.add.side_effect = add_side_effect
        tenant_db.flush.side_effect = flush_side_effect
        tenant_db.commit.return_value = None
        tenant_db.refresh.return_value = None

        service = TechDocsDossierService()
        with tempfile.TemporaryDirectory() as tmp_dir:
            with patch("app.apps.tenant_modules.techdocs.services.dossier_service.settings") as mocked_settings:
                mocked_settings.TECHDOCS_ATTACHMENTS_DIR = str(Path(tmp_dir) / "techdocs")
                created = service.add_evidence(
                    tenant_db,
                    20,
                    file_name="evidencia.pdf",
                    content_type="application/pdf",
                    content_bytes=b"%PDF-demo",
                    evidence_kind="report",
                    description="Documento base",
                    actor_user_id=4,
                )

                self.assertEqual(created.id, 81)
                self.assertEqual(created.evidence_kind, "report")
                self.assertTrue((Path(mocked_settings.TECHDOCS_ATTACHMENTS_DIR) / created.storage_key).exists())

        audit_rows = [item for item in added_items if isinstance(item, TechDocsAuditEvent)]
        self.assertEqual(len(audit_rows), 1)
        self.assertEqual(audit_rows[0].event_type, "evidence_uploaded")


if __name__ == "__main__":
    unittest.main()
