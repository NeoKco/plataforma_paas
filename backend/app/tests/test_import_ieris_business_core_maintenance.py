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

    def test_import_sanitizes_visible_legacy_text_before_persisting(self) -> None:
        captured: dict[str, dict] = {}

        class _FakeQuery:
            def all(self) -> list:
                return []

        class _FakeTenantDb:
            def query(self, _model):
                return _FakeQuery()

            def delete(self, _item) -> None:
                return None

            def flush(self) -> None:
                return None

        def fake_get_or_create_organization(_tenant_db, **kwargs):
            captured["organization"] = kwargs
            return SimpleNamespace(id=101, name=kwargs["name"])

        def fake_get_or_create_client(_tenant_db, **kwargs):
            captured["client"] = kwargs
            return SimpleNamespace(id=202)

        def fake_get_or_create_site(_tenant_db, **kwargs):
            captured["site"] = kwargs
            return SimpleNamespace(id=303)

        def fake_get_or_create_work_order(_tenant_db, **kwargs):
            captured["work_order"] = kwargs
            return SimpleNamespace(id=404), True

        legacy_data = {
            "empresa": [],
            "clientes": [
                {
                    "id": 1,
                    "nombre": "Cliente Uno",
                    "organizacion": "Cliente Uno",
                    "rut": "11.111.111-1",
                    "fono_contacto_1": "+56 9 1111 1111",
                    "mail_contacto_1": "cliente@example.com",
                    "mail_contacto_2": None,
                    "fono_contacto_2": None,
                    "contacto_1": "Sin contacto",
                    "contacto_2": None,
                    "observaciones": "Nota visible\nlegacy_client_id=1",
                    "motivo_baja": "legacy_status=inactive",
                    "tipo_cliente": "Industrial\nlegacy_tipo=1",
                    "giro": "legacy_giro=1\nServicios",
                    "estado": "activo",
                    "calle": "Calle Falsa",
                    "numero_casa": "123",
                    "comuna": "Santiago",
                    "ciudad": "Santiago",
                    "region": "RM",
                }
            ],
            "perfil_funcional": [],
            "work_groups": [],
            "task_types": [],
            "tipo_equipo": [],
            "instalacion_sst": [],
            "mantenciones": [
                {
                    "id": 50,
                    "cliente_id": 1,
                    "fecha_programada": "2026-01-02",
                    "hora_programada": "09:30:00",
                    "estado_tarea_mantencion": "completada",
                    "descripcion": "Mantención visible\nlegacy_work_order_id=50",
                    "observaciones": "Nota útil\nlegacy_obs=1",
                    "estado_del_equipo": "Operativo\nlegacy_status=1",
                    "fecha_creacion": "2026-01-01",
                }
            ],
            "historico_mantenciones": [],
        }

        with patch.object(import_script, "resolve_actor_user_id", return_value=1), patch.object(
            import_script, "get_or_create_organization", side_effect=fake_get_or_create_organization
        ), patch.object(
            import_script, "get_or_create_client", side_effect=fake_get_or_create_client
        ), patch.object(
            import_script, "get_or_create_site", side_effect=fake_get_or_create_site
        ), patch.object(
            import_script, "get_or_create_work_order", side_effect=fake_get_or_create_work_order
        ), patch.object(import_script, "ensure_status_log"), patch.object(
            import_script, "ensure_visit"
        ):
            result = import_script.import_business_core_and_maintenance(
                _FakeTenantDb(),
                legacy_data=legacy_data,
                actor_user_id=1,
            )

        self.assertEqual(
            captured["organization"]["notes"],
            "Nota visible",
        )
        self.assertEqual(
            captured["client"]["commercial_notes"],
            "Tipo de cliente: Industrial\nGiro: Servicios\nNota visible",
        )
        self.assertEqual(captured["work_order"]["title"], "Mantención visible")
        self.assertEqual(
            captured["work_order"]["description"],
            "Mantención visible\nNota útil\nEstado del equipo: Operativo",
        )
        self.assertEqual(captured["work_order"]["closure_notes"], "Nota útil")
        self.assertEqual(result["business_core"]["clients"]["created"], 0)


if __name__ == "__main__":
    unittest.main()
