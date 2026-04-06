import json
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from app.tests.fixtures import set_test_environment

set_test_environment()

from app.scripts import import_ieris_business_core_maintenance as import_script  # noqa: E402


class ImportIerisBusinessCoreMaintenanceTestCase(unittest.TestCase):
    def _build_matching_result(self) -> dict:
        return {
            "source_counts": {
                "empresa": 1,
                "clientes": 1,
                "perfil_funcional": 1,
                "work_groups": 1,
                "task_types": 1,
                "tipo_equipo": 1,
                "instalacion_sst": 1,
                "mantenciones": 1,
                "historico_mantenciones": 2,
            },
            "business_core": {
                "organizations": {"created": 1, "existing": 0, "updated": 0, "skipped": 0},
                "clients": {"created": 1, "existing": 0, "updated": 0, "skipped": 0},
                "contacts": {"created": 0, "existing": 0, "updated": 0, "skipped": 0},
                "sites": {"created": 1, "existing": 0, "updated": 0, "skipped": 0},
                "function_profiles": {"created": 1, "existing": 0, "updated": 0, "skipped": 0},
                "work_groups": {"created": 1, "existing": 0, "updated": 0, "skipped": 0},
                "task_types": {"created": 1, "existing": 0, "updated": 0, "skipped": 0},
            },
            "maintenance": {
                "equipment_types": {"created": 1, "existing": 0, "updated": 0, "skipped": 0},
                "installations": {"created": 1, "existing": 0, "updated": 0, "skipped": 0},
                "work_orders": {"created": 3, "existing": 0, "updated": 0, "skipped": 0},
                "status_logs": {"created": 3, "existing": 0, "updated": 0, "skipped": 0},
                "visits": {"created": 3, "existing": 0, "updated": 0, "skipped": 0},
            },
            "skipped_notes": [],
        }

    def test_verify_import_summary_accepts_matching_counts(self) -> None:
        verification = import_script.verify_import_summary(self._build_matching_result())

        self.assertTrue(verification["business_core.organizations"]["matches"])
        self.assertEqual(verification["maintenance.work_orders"]["expected"], 3)
        self.assertEqual(verification["maintenance.work_orders"]["processed"], 3)

    def test_verify_import_summary_rejects_mismatch(self) -> None:
        result = self._build_matching_result()
        result["maintenance"]["work_orders"]["created"] = 2

        with self.assertRaises(ValueError) as exc:
            import_script.verify_import_summary(result)

        self.assertIn("maintenance.work_orders", str(exc.exception))

    def test_main_commits_and_writes_success_report_in_apply_mode(self) -> None:
        result = self._build_matching_result()
        with tempfile.TemporaryDirectory() as tmp_dir:
            report_out = Path(tmp_dir) / "report.json"
            args = SimpleNamespace(
                tenant_slug="empresa-bootstrap",
                actor_user_id=1,
                legacy_app_dir=Path("/legacy/app"),
                legacy_env=None,
                legacy_db_name=None,
                legacy_db_user=None,
                legacy_db_password=None,
                legacy_db_host=None,
                legacy_db_port=None,
                report_out=report_out,
                skip_historical=False,
                apply=True,
            )

            control_db = MagicMock(name="control_db")
            tenant_db = MagicMock(name="tenant_db")
            tenant = SimpleNamespace(slug="empresa-bootstrap")
            tenant_service = MagicMock()
            tenant_service.get_tenant.return_value = tenant
            tenant_service.get_tenant_session.return_value = lambda: tenant_db

            with patch.object(import_script, "parse_args", return_value=args), patch.object(
                import_script,
                "load_legacy_db_config",
                return_value={
                    "dbname": "legacy",
                    "user": "legacy_user",
                    "password": "legacy_password",
                    "host": "127.0.0.1",
                    "port": 5432,
                },
            ), patch.object(import_script, "fetch_legacy_source", return_value={"empresa": []}), patch.object(
                import_script, "ControlSessionLocal", return_value=control_db
            ), patch.object(import_script, "TenantConnectionService", return_value=tenant_service), patch.object(
                import_script, "assert_required_target_tables"
            ) as assert_required_target_tables, patch.object(
                import_script, "import_business_core_and_maintenance", return_value=result
            ) as import_business_core_and_maintenance:
                exit_code = import_script.main()

            self.assertEqual(exit_code, 0)
            control_db.close.assert_called_once()
            tenant_db.commit.assert_called_once()
            tenant_db.rollback.assert_not_called()
            tenant_db.close.assert_called_once()
            assert_required_target_tables.assert_called_once_with(tenant_db)
            import_business_core_and_maintenance.assert_called_once()

            report = json.loads(report_out.read_text(encoding="utf-8"))
            self.assertEqual(report["status"], "ok")
            self.assertEqual(report["mode"], "apply")
            self.assertEqual(report["result"]["verification"]["maintenance.work_orders"]["expected"], 3)

    def test_main_rolls_back_in_dry_run_mode(self) -> None:
        result = self._build_matching_result()
        with tempfile.TemporaryDirectory() as tmp_dir:
            report_out = Path(tmp_dir) / "report.json"
            args = SimpleNamespace(
                tenant_slug="empresa-bootstrap",
                actor_user_id=1,
                legacy_app_dir=Path("/legacy/app"),
                legacy_env=None,
                legacy_db_name=None,
                legacy_db_user=None,
                legacy_db_password=None,
                legacy_db_host=None,
                legacy_db_port=None,
                report_out=report_out,
                skip_historical=False,
                apply=False,
            )

            control_db = MagicMock(name="control_db")
            tenant_db = MagicMock(name="tenant_db")
            tenant = SimpleNamespace(slug="empresa-bootstrap")
            tenant_service = MagicMock()
            tenant_service.get_tenant.return_value = tenant
            tenant_service.get_tenant_session.return_value = lambda: tenant_db

            with patch.object(import_script, "parse_args", return_value=args), patch.object(
                import_script,
                "load_legacy_db_config",
                return_value={
                    "dbname": "legacy",
                    "user": "legacy_user",
                    "password": "legacy_password",
                    "host": "127.0.0.1",
                    "port": 5432,
                },
            ), patch.object(import_script, "fetch_legacy_source", return_value={"empresa": []}), patch.object(
                import_script, "ControlSessionLocal", return_value=control_db
            ), patch.object(import_script, "TenantConnectionService", return_value=tenant_service), patch.object(
                import_script, "assert_required_target_tables"
            ), patch.object(
                import_script, "import_business_core_and_maintenance", return_value=result
            ):
                exit_code = import_script.main()

            self.assertEqual(exit_code, 0)
            tenant_db.commit.assert_not_called()
            tenant_db.rollback.assert_called_once()
            tenant_db.close.assert_called_once()
            report = json.loads(report_out.read_text(encoding="utf-8"))
            self.assertEqual(report["status"], "ok")
            self.assertEqual(report["mode"], "dry-run")


if __name__ == "__main__":
    unittest.main()
