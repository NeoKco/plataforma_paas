import tempfile
import unittest
from pathlib import Path
from unittest.mock import Mock

from app.scripts.audit_active_tenant_convergence import (
    build_audit_payload,
    build_audit_summary,
    classify_tenant_operational_error,
    determine_overall_status,
    is_accepted_tenant_note,
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

    def test_get_finance_defaults_status_marks_accepted_legacy_tenant_as_explicit_note(self) -> None:
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
                query.filter.return_value.first.return_value = Mock(setting_value="USD")
                return query
            raise AssertionError(model_name)

        fake_db.query.side_effect = query_side_effect

        status = get_finance_defaults_status(
            fake_db,
            force=False,
            tenant_slug="empresa-bootstrap",
        )

        self.assertFalse(status["needs_seed"])
        self.assertEqual(status["seed_reason"], "accepted_legacy_base_currency_with_usage")
        self.assertEqual(
            status["audit_note"],
            "accepted_legacy_finance_base_currency:USD",
        )

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

    def test_build_audit_summary_includes_accepted_notes_breakdown(self) -> None:
        summary = build_audit_summary(
            processed=1,
            warnings=0,
            failed=0,
            failed_by_reason={},
            tenants_with_notes=0,
            notes_by_reason={},
            accepted_tenants_with_notes=1,
            accepted_notes_by_reason={
                "accepted_legacy_finance_base_currency:USD": 1
            },
        )

        self.assertIn("accepted_tenants_with_notes=1", summary)
        self.assertIn(
            "accepted_notes_by_reason={'accepted_legacy_finance_base_currency:USD': 1}",
            summary,
        )

    def test_is_accepted_tenant_note_recognizes_accepted_legacy_finance(self) -> None:
        self.assertTrue(
            is_accepted_tenant_note("accepted_legacy_finance_base_currency:USD")
        )
        self.assertFalse(is_accepted_tenant_note("legacy_finance_base_currency:USD"))

    def test_determine_overall_status_prefers_failed_over_other_signals(self) -> None:
        self.assertEqual(
            determine_overall_status(
                warnings=1,
                failed=1,
                tenants_with_notes=3,
                accepted_tenants_with_notes=2,
            ),
            "failed",
        )

    def test_determine_overall_status_distinguishes_notes_and_accepted_notes(self) -> None:
        self.assertEqual(
            determine_overall_status(
                warnings=0,
                failed=0,
                tenants_with_notes=2,
                accepted_tenants_with_notes=1,
            ),
            "ok_with_notes",
        )
        self.assertEqual(
            determine_overall_status(
                warnings=0,
                failed=0,
                tenants_with_notes=0,
                accepted_tenants_with_notes=1,
            ),
            "ok_with_accepted_notes",
        )

    def test_build_audit_payload_includes_summary_and_results(self) -> None:
        payload = build_audit_payload(
            processed=2,
            warnings=0,
            failed=0,
            failed_by_reason={},
            tenants_with_notes=0,
            notes_by_reason={},
            accepted_tenants_with_notes=1,
            accepted_notes_by_reason={
                "accepted_legacy_finance_base_currency:USD": 1,
            },
            tenant_results=[
                {
                    "tenant_slug": "empresa-bootstrap",
                    "status": "ok",
                    "notes": ["accepted_legacy_finance_base_currency:USD"],
                }
            ],
            target="all-active",
            limit=100,
            include_archived=False,
        )

        self.assertEqual(payload["overall_status"], "ok_with_accepted_notes")
        self.assertEqual(payload["summary"]["processed"], 2)
        self.assertEqual(payload["summary"]["accepted_tenants_with_notes"], 1)
        self.assertEqual(payload["target"], "all-active")
        self.assertEqual(payload["limit"], 100)
        self.assertEqual(payload["tenant_results"][0]["tenant_slug"], "empresa-bootstrap")
        self.assertIn("generated_at", payload)

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
