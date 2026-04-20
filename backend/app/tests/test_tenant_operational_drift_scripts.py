import unittest

from app.scripts.audit_active_tenant_convergence import (
    classify_tenant_operational_error,
)
from app.scripts.repair_tenant_operational_drift import should_rotate_db_credentials


class TenantOperationalDriftScriptsTestCase(unittest.TestCase):
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
