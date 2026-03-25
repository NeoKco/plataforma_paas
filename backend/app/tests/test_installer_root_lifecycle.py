import os
import unittest
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

os.environ["DEBUG"] = "true"
os.environ["APP_ENV"] = "test"

from app.apps.installer.schemas import InstallRequest  # noqa: E402
from app.apps.installer.services.installer_service import InstallerService  # noqa: E402
from app.apps.platform_control.services.platform_root_account_service import (  # noqa: E402
    PlatformRootAccountService,
)


class PlatformRootAccountServiceTestCase(unittest.TestCase):
    def test_bootstrap_initial_superadmin_normalizes_email(self) -> None:
        saved_users = []

        class FakePlatformUserRepository:
            def get_by_email(self, db, email):
                return None

            def save(self, db, user):
                user.id = 9
                saved_users.append(user)
                return user

        service = PlatformRootAccountService(
            platform_user_repository=FakePlatformUserRepository()
        )

        with patch(
            "app.apps.platform_control.services.platform_root_account_service.hash_password",
            return_value="hashed-root-password",
        ):
            user = service.bootstrap_initial_superadmin(
                object(),
                full_name="  Root Admin  ",
                email="  ROOT@Platform.dev  ",
                password="Secret123!",
            )

        self.assertEqual(user.id, 9)
        self.assertEqual(user.full_name, "Root Admin")
        self.assertEqual(user.email, "root@platform.dev")
        self.assertEqual(user.role, "superadmin")
        self.assertTrue(saved_users[0].is_active)

    def test_recover_root_account_rejects_invalid_recovery_key(self) -> None:
        class FakePlatformUserRepository:
            def count_active_by_role(self, db, role):
                return 0

            def get_by_email(self, db, email):
                return None

        service = PlatformRootAccountService(
            platform_user_repository=FakePlatformUserRepository()
        )

        with patch(
            "app.apps.platform_control.services.platform_root_account_service.verify_password",
            return_value=False,
        ):
            with self.assertRaises(ValueError):
                service.recover_root_account(
                    object(),
                    recovery_key_hash="stored-hash",
                    recovery_key="bad-key",
                    full_name="Recovered Root",
                    email="root@platform.dev",
                    password="Secret123!",
                )

    def test_recover_root_account_blocks_when_active_superadmin_exists(self) -> None:
        class FakePlatformUserRepository:
            def count_active_by_role(self, db, role):
                return 1

        service = PlatformRootAccountService(
            platform_user_repository=FakePlatformUserRepository()
        )

        with self.assertRaises(ValueError):
            service.recover_root_account(
                object(),
                recovery_key_hash="stored-hash",
                recovery_key="valid-key",
                full_name="Recovered Root",
                email="root@platform.dev",
                password="Secret123!",
            )


class InstallerServiceTestCase(unittest.TestCase):
    def test_run_installation_returns_root_email_and_recovery_key(self) -> None:
        payload = InstallRequest(
            admin_db_user="postgres",
            admin_db_password="postgres",
            control_db_password="owner-secret",
            initial_superadmin_full_name="Root Admin",
            initial_superadmin_email="root@platform.dev",
            initial_superadmin_password="Secret123!",
        )
        service = InstallerService()
        fake_db = MagicMock()

        with patch(
            "app.apps.installer.services.installer_service.PostgresBootstrapService"
        ) as mock_bootstrap, patch.object(
            service,
            "_build_control_session",
            return_value=fake_db,
        ), patch.object(
            service,
            "_bootstrap_platform_state",
        ) as mock_bootstrap_state, patch.object(
            service,
            "_write_env_file",
        ) as mock_write_env, patch.object(
            service,
            "_write_install_flag",
        ):
            result = service.run_installation(payload)

        self.assertEqual(result["initial_superadmin_email"], "root@platform.dev")
        self.assertTrue(result["recovery_key"])
        mock_bootstrap.return_value.bootstrap_control_database.assert_called_once()
        mock_bootstrap_state.assert_called_once_with(fake_db, payload)
        _, kwargs = mock_write_env.call_args
        self.assertIn("recovery_key_hash", kwargs)
        self.assertNotEqual(kwargs["recovery_key_hash"], result["recovery_key"])
        fake_db.close.assert_called_once()


if __name__ == "__main__":
    unittest.main()
