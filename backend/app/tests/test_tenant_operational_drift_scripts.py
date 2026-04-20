import tempfile
import unittest
from pathlib import Path
from unittest.mock import Mock

from app.scripts.audit_active_tenant_convergence import (
    build_audit_summary,
    classify_tenant_operational_error,
)
from app.scripts.repair_tenant_operational_drift import (
    should_rotate_db_credentials,
    sync_tenant_db_password_to_env_files,
)
from app.scripts.seed_missing_tenant_defaults import get_finance_defaults_status


class TenantOperationalDriftScriptsTestCase(unittest.TestCase):
    def test_get_finance_defaults_status_marks_legacy_base_currency_with_usage_as_note_only(self) -> None:
        fake_db = Mock()

        def query_side_effect(model):
            query = Mock()
            model_name = getattr(model, "__name__", None)
            if model_name is None:
                model_name = getattr(getattr(model, "class_", None), "__name__", None)

            if model_name == "FinanceTransaction":
                query.first.return_value = object()
                return query
            if model_name in {"FinanceBudget", "FinanceAccount"}:
                query.first.return_value = None
                return query
            if model_name == "FinanceCategory":
                query.all.return_value = [
                    Mock(name="Ingreso General"),
                    Mock(name="Mantenciones y servicios"),
                ]
                query.all.return_value[0].name = "Ingreso General"
                query.all.return_value[1].name = "Mantenciones y servicios"
                return query
            if model_name == "FinanceCurrency":
                query.filter.return_value.first.return_value = Mock(is_active=True, code="USD")
                return query
            if model_name == "FinanceSetting":
                query.filter.return_value.first.return_value = Mock(
                    setting_value="USD"
                )
                return query
            raise AssertionError(model_name)

        fake_db.query.side_effect = query_side_effect

        status = get_finance_defaults_status(fake_db, force=False)

        self.assertFalse(status["needs_seed"])
        self.assertEqual(status["seed_reason"], "legacy_base_currency_with_usage")
        self.assertEqual(status["audit_note"], "legacy_finance_base_currency:USD")

    def test_get_finance_defaults_status_reports_base_currency_mismatch_with_usage(self) -> None:
        fake_db = Mock()

        finance_currency_calls = {"count": 0}

        def query_side_effect(model):
            query = Mock()
            model_name = getattr(model, "__name__", None)
            if model_name is None:
                model_name = getattr(getattr(model, "class_", None), "__name__", None)

            if model_name == "FinanceTransaction":
                query.first.return_value = object()
                return query
            if model_name in {"FinanceBudget", "FinanceAccount"}:
                query.first.return_value = None
                return query
            if model_name == "FinanceCategory":
                query.all.return_value = [
                    Mock(name="Ingreso General"),
                    Mock(name="Mantenciones y servicios"),
                ]
                query.all.return_value[0].name = "Ingreso General"
                query.all.return_value[1].name = "Mantenciones y servicios"
                return query
            if model_name == "FinanceCurrency":
                finance_currency_calls["count"] += 1
                if finance_currency_calls["count"] == 1:
                    query.filter.return_value.first.return_value = Mock(is_active=True, code="CLP")
                else:
                    query.filter.return_value.first.return_value = Mock(is_active=True, code="CLP")
                return query
            if model_name == "FinanceSetting":
                query.filter.return_value.first.return_value = Mock(
                    setting_value="USD"
                )
                return query
            raise AssertionError(model_name)

        fake_db.query.side_effect = query_side_effect

        status = get_finance_defaults_status(fake_db, force=False)

        self.assertFalse(status["needs_seed"])
        self.assertEqual(status["seed_reason"], "base_currency_mismatch")
        self.assertEqual(status["audit_note"], "finance_base_currency_mismatch:CLP!=USD")

    def test_sync_tenant_db_password_to_env_files_writes_secret(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            target = Path(temp_dir) / ".tenant-secrets.env"
            synced = sync_tenant_db_password_to_env_files(
                tenant_slug="empresa-demo",
                password="super-secret",
                env_files=[str(target)],
            )

            self.assertEqual(synced, [str(target.resolve())])
            self.assertIn(
                "TENANT_DB_PASSWORD__EMPRESA_DEMO=super-secret",
                target.read_text(encoding="utf-8"),
            )

    def test_build_audit_summary_includes_failed_and_notes_breakdown(self) -> None:
        summary = build_audit_summary(
            processed=4,
            warnings=0,
            failed=1,
            failed_by_reason={"invalid_db_credentials": 1},
            tenants_with_notes=2,
            notes_by_reason={"missing_core_defaults": 1, "missing_finance_defaults:usage": 2},
        )

        self.assertIn("processed=4", summary)
        self.assertIn("failed=1", summary)
        self.assertIn("tenants_with_notes=2", summary)
        self.assertIn("failed_by_reason={'invalid_db_credentials': 1}", summary)
        self.assertIn("notes_by_reason={'missing_core_defaults': 1, 'missing_finance_defaults:usage': 2}", summary)

    def test_classify_invalid_db_credentials_error(self) -> None:
        exc = RuntimeError(
            "connection to server at '127.0.0.1', port 5432 failed: "
            "FATAL:  la autentificación password falló para el usuario"
        )

        self.assertEqual(
            classify_tenant_operational_error(exc),
            "invalid_db_credentials",
        )

    def test_classify_schema_incomplete_error(self) -> None:
        exc = RuntimeError('relation "tenant_info" does not exist')

        self.assertEqual(
            classify_tenant_operational_error(exc),
            "schema_incomplete",
        )

    def test_should_rotate_db_credentials_when_auto_mode_matches_invalid_credentials(self) -> None:
        self.assertTrue(
            should_rotate_db_credentials(
                explicit_rotate=False,
                auto_rotate_if_invalid_credentials=True,
                pre_audit_error_code="invalid_db_credentials",
            )
        )

    def test_should_not_rotate_db_credentials_for_unrelated_pre_audit_error(self) -> None:
        self.assertFalse(
            should_rotate_db_credentials(
                explicit_rotate=False,
                auto_rotate_if_invalid_credentials=True,
                pre_audit_error_code="schema_incomplete",
            )
        )


if __name__ == "__main__":
    unittest.main()
