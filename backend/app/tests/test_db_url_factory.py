import unittest

from app.common.db.tenant_database import build_tenant_database_url
from app.common.db.url_factory import build_postgres_url


class DbUrlFactoryTestCase(unittest.TestCase):
    def test_build_postgres_url_escapes_reserved_password_chars(self) -> None:
        url = build_postgres_url(
            host="127.0.0.1",
            port=5432,
            database="platform_control",
            username="postgres",
            password="Sup3r@Secret:Pass/Word?",
        )

        rendered = url.render_as_string(hide_password=False)

        self.assertIn("postgresql+psycopg2://postgres:", rendered)
        self.assertIn("@127.0.0.1:5432/platform_control", rendered)
        self.assertNotIn("Sup3r@Secret:Pass/Word?", rendered)
        self.assertEqual(url.password, "Sup3r@Secret:Pass/Word?")

    def test_build_tenant_database_url_preserves_real_password_for_engine_usage(self) -> None:
        url = build_tenant_database_url(
            host="127.0.0.1",
            port=5432,
            database="tenant_empresa_demo",
            username="user_empresa_demo",
            password="TempTenantPass123",
        )

        self.assertEqual(url.password, "TempTenantPass123")
        self.assertIn("***", str(url))
        self.assertEqual(
            url.render_as_string(hide_password=False),
            "postgresql+psycopg2://user_empresa_demo:TempTenantPass123@127.0.0.1:5432/tenant_empresa_demo",
        )


if __name__ == "__main__":
    unittest.main()
