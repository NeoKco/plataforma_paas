import json
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from app.tests.fixtures import set_test_environment

set_test_environment()

from app.scripts import import_ieris_products_catalog as import_script  # noqa: E402


class ImportIerisProductsCatalogTestCase(unittest.TestCase):
    def _build_matching_result(self) -> dict:
        return {
            "source_counts": {
                "items": 2,
                "characteristics": 3,
                "with_photo": 2,
                "with_url": 1,
            },
            "products": {"created": 2, "updated": 0, "existing": 0, "skipped": 0, "missing_files": 0},
            "sources": {"created": 2, "updated": 0, "existing": 0, "skipped": 0, "missing_files": 0},
            "price_history": {"created": 2, "updated": 0, "existing": 0, "skipped": 0, "missing_files": 0},
            "images": {"created": 2, "updated": 0, "existing": 0, "skipped": 0, "missing_files": 0},
            "characteristics": {"created": 3, "expected": 3},
        }

    def test_verify_import_summary_accepts_matching_counts(self) -> None:
        verification = import_script.verify_import_summary(self._build_matching_result())

        self.assertEqual(verification["products"]["expected"], 2)
        self.assertEqual(verification["images"]["processed"], 2)
        self.assertEqual(verification["characteristics"]["processed"], 3)

    def test_verify_import_summary_rejects_mismatch(self) -> None:
        result = self._build_matching_result()
        result["images"]["missing_files"] = 1

        with self.assertRaises(ValueError) as exc:
            import_script.verify_import_summary(result)

        self.assertIn("images", str(exc.exception))

    def test_build_characteristics_payload_appends_unit(self) -> None:
        payload = import_script.build_characteristics_payload(
            [
                {"clave": "Sección", "valor": "4", "unidad": "mm"},
                {"clave": "Marca", "valor": "Marca Cable", "unidad": None},
            ]
        )

        self.assertEqual(payload[0]["value"], "4 mm")
        self.assertEqual(payload[1]["value"], "Marca Cable")

    def test_main_writes_success_report_in_dry_run_mode(self) -> None:
        result = self._build_matching_result()
        with tempfile.TemporaryDirectory() as tmp_dir:
            report_out = Path(tmp_dir) / "report.json"
            media_root = Path(tmp_dir) / "media"
            args = SimpleNamespace(
                tenant_slug="ieris-ltda",
                actor_user_id=1,
                legacy_app_dir=Path("/legacy/app"),
                legacy_env=None,
                legacy_db_name=None,
                legacy_db_user=None,
                legacy_db_password=None,
                legacy_db_host=None,
                legacy_db_port=None,
                target_media_dir=media_root,
                report_out=report_out,
                apply=False,
            )

            control_db = MagicMock(name="control_db")
            tenant_db = MagicMock(name="tenant_db")
            tenant = SimpleNamespace(slug="ieris-ltda")
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
            ), patch.object(import_script, "fetch_legacy_source", return_value={"source_counts": {"items": 0, "characteristics": 0, "with_photo": 0, "with_url": 0}}), patch.object(
                import_script, "ControlSessionLocal", return_value=control_db
            ), patch.object(import_script, "TenantConnectionService", return_value=tenant_service), patch.object(
                import_script, "assert_required_target_tables"
            ), patch.object(
                import_script, "import_products_catalog", return_value=result
            ):
                exit_code = import_script.main()

            self.assertEqual(exit_code, 0)
            tenant_db.commit.assert_not_called()
            tenant_db.rollback.assert_called_once()
            tenant_db.close.assert_called_once()

            report = json.loads(report_out.read_text(encoding="utf-8"))
            self.assertEqual(report["status"], "ok")
            self.assertEqual(report["mode"], "dry-run")
            self.assertEqual(report["result"]["verification"]["products"]["expected"], 2)
