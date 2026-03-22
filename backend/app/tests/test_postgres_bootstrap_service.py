import unittest
from unittest.mock import MagicMock, patch

from app.tests.fixtures import set_test_environment

set_test_environment()

from app.apps.installer.services.postgres_bootstrap_service import (  # noqa: E402
    PostgresBootstrapService,
)


class PostgresBootstrapServiceTestCase(unittest.TestCase):
    def test_create_role_if_not_exists_creates_missing_role(self) -> None:
        service = PostgresBootstrapService(
            admin_host="127.0.0.1",
            admin_port=5432,
            admin_db_name="postgres",
            admin_user="postgres",
            admin_password="secret",
        )
        engine = MagicMock()
        conn = engine.connect.return_value.__enter__.return_value

        with patch.object(service, "role_exists", return_value=False):
            with patch.object(service, "_get_engine", return_value=engine):
                service.create_role_if_not_exists("user_demo", "pwd-1")

        conn.execute.assert_called_once()
        sql, params = conn.execute.call_args.args
        self.assertIn('CREATE ROLE "user_demo"', str(sql))
        self.assertEqual(params, {"role_password": "pwd-1"})

    def test_create_role_if_not_exists_rotates_password_for_existing_role(self) -> None:
        service = PostgresBootstrapService(
            admin_host="127.0.0.1",
            admin_port=5432,
            admin_db_name="postgres",
            admin_user="postgres",
            admin_password="secret",
        )
        engine = MagicMock()
        conn = engine.connect.return_value.__enter__.return_value

        with patch.object(service, "role_exists", return_value=True):
            with patch.object(service, "_get_engine", return_value=engine):
                service.create_role_if_not_exists("user_demo", "pwd-2")

        conn.execute.assert_called_once()
        sql, params = conn.execute.call_args.args
        self.assertIn('ALTER ROLE "user_demo"', str(sql))
        self.assertEqual(params, {"role_password": "pwd-2"})
