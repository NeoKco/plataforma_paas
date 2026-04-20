import tempfile
import unittest
from pathlib import Path

from app.scripts.audit_active_tenant_convergence import (
    build_audit_summary,
    classify_tenant_operational_error,
)
from app.scripts.repair_tenant_operational_drift import (
    should_rotate_db_credentials,
    sync_tenant_db_password_to_env_files,
)


class TenantOperationalDriftScriptsTestCase(unittest.TestCase):
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
