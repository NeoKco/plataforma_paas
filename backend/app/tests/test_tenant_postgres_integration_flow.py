import os
import unittest

os.environ["DEBUG"] = "true"
os.environ["APP_ENV"] = "test"

from app.apps.tenant_modules.core.models.role import Role  # noqa: F401,E402
from app.apps.tenant_modules.core.models.tenant_info import TenantInfo  # noqa: F401,E402
from app.apps.tenant_modules.core.models.user import User  # noqa: F401,E402
from app.apps.tenant_modules.core.services.tenant_data_service import (  # noqa: E402
    TenantDataService,
)
from app.apps.tenant_modules.finance.models.entry import FinanceEntry  # noqa: F401,E402
from app.apps.tenant_modules.finance.services.finance_service import (  # noqa: E402
    FinanceService,
)
from app.common.db.tenant_base import TenantBase  # noqa: E402
from app.tests.db_test_utils import (  # noqa: E402
    build_postgres_session,
    drop_postgres_database,
    get_postgres_test_config,
)


@unittest.skipUnless(
    get_postgres_test_config() is not None,
    "PGTEST_* no configurado para pruebas PostgreSQL",
)
class TenantPostgresIntegrationTestCase(unittest.TestCase):
    def setUp(self) -> None:
        self.db, self.engine, self.database_name = build_postgres_session(
            TenantBase,
            "tenant_it",
        )
        self.tenant_data_service = TenantDataService()
        self.finance_service = FinanceService()

    def tearDown(self) -> None:
        self.db.close()
        self.engine.dispose()
        drop_postgres_database(self.database_name)

    def test_create_user_and_finance_entry_against_postgres(self) -> None:
        user = self.tenant_data_service.create_user(
            tenant_db=self.db,
            full_name="Operador PG",
            email="operador.pg@empresa-bootstrap.local",
            password="OperadorPg123!",
            role="operator",
            is_active=True,
        )

        entry = self.finance_service.create_entry(
            tenant_db=self.db,
            movement_type="income",
            concept="Cobro PG",
            amount=1500.0,
            category="billing",
            created_by_user_id=user.id,
        )
        summary = self.finance_service.get_summary(self.db)

        self.assertIsNotNone(user.id)
        self.assertIsNotNone(entry.id)
        self.assertEqual(summary["total_income"], 1500.0)
        self.assertEqual(summary["balance"], 1500.0)


if __name__ == "__main__":
    unittest.main()
