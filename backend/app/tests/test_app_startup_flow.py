import os
import unittest
from unittest.mock import patch

os.environ["DEBUG"] = "true"
os.environ["APP_ENV"] = "test"

from fastapi.testclient import TestClient  # noqa: E402

from app.bootstrap.app_factory import create_app  # noqa: E402


class AppStartupFlowTestCase(unittest.TestCase):
    def test_startup_runs_control_migrations_when_platform_installed(self) -> None:
        with (
            patch("app.bootstrap.app_factory.is_platform_installed", return_value=True),
            patch("app.bootstrap.app_factory.run_control_migrations") as run_migrations,
            patch("app.bootstrap.app_factory.RuntimeSecurityService") as security_service_cls,
        ):
            security_service = security_service_cls.return_value
            app = create_app()

            with TestClient(app):
                pass

        security_service.validate_settings.assert_called_once()
        run_migrations.assert_called_once()

    def test_startup_skips_control_migrations_when_platform_not_installed(self) -> None:
        with (
            patch("app.bootstrap.app_factory.is_platform_installed", return_value=False),
            patch("app.bootstrap.app_factory.run_control_migrations") as run_migrations,
            patch("app.bootstrap.app_factory.RuntimeSecurityService") as security_service_cls,
        ):
            security_service = security_service_cls.return_value
            app = create_app()

            with TestClient(app):
                pass

        security_service.validate_settings.assert_called_once()
        run_migrations.assert_not_called()


if __name__ == "__main__":
    unittest.main()
