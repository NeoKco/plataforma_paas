import unittest

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


if __name__ == "__main__":
    unittest.main()
