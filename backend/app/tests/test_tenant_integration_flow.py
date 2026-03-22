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
from app.common.security.password_service import verify_password  # noqa: E402
from app.tests.db_test_utils import build_sqlite_session  # noqa: E402


class TenantIntegrationTestCase(unittest.TestCase):
    def setUp(self) -> None:
        self.db, self.engine = build_sqlite_session(TenantBase)
        self.tenant_data_service = TenantDataService()
        self.finance_service = FinanceService()

    def tearDown(self) -> None:
        self.db.close()
        self.engine.dispose()

    def test_create_and_update_user_against_real_tenant_db(self) -> None:
        user = self.tenant_data_service.create_user(
            tenant_db=self.db,
            full_name="Operador Uno",
            email="operador@empresa-bootstrap.local",
            password="Operador123!",
            role="operator",
            is_active=True,
        )

        self.assertIsNotNone(user.id)
        self.assertEqual(len(self.tenant_data_service.list_users(self.db)), 1)
        self.assertTrue(verify_password("Operador123!", user.password_hash))

        updated_user = self.tenant_data_service.update_user(
            tenant_db=self.db,
            user_id=user.id,
            full_name="Operador Editado",
            email="operador@empresa-bootstrap.local",
            role="manager",
            password="Manager123!",
        )

        self.assertEqual(updated_user.role, "manager")
        self.assertTrue(verify_password("Manager123!", updated_user.password_hash))

    def test_update_user_status_persists_in_real_tenant_db(self) -> None:
        user = self.tenant_data_service.create_user(
            tenant_db=self.db,
            full_name="Supervisor",
            email="supervisor@empresa-bootstrap.local",
            password="Supervisor123!",
            role="manager",
            is_active=True,
        )

        updated_user = self.tenant_data_service.update_user_status(
            tenant_db=self.db,
            user_id=user.id,
            is_active=False,
            actor_user_id=99,
        )

        persisted_user = self.tenant_data_service.get_user_by_id(self.db, user.id)

        self.assertFalse(updated_user.is_active)
        self.assertFalse(persisted_user.is_active)

    def test_finance_entries_and_summary_against_real_tenant_db(self) -> None:
        self.finance_service.create_entry(
            tenant_db=self.db,
            movement_type="income",
            concept="Cobro mensual",
            amount=1000.0,
            category="billing",
            created_by_user_id=1,
        )
        self.finance_service.create_entry(
            tenant_db=self.db,
            movement_type="expense",
            concept="Internet oficina",
            amount=55.5,
            category="services",
            created_by_user_id=1,
        )

        entries = self.finance_service.list_entries(self.db)
        summary = self.finance_service.get_summary(self.db)

        self.assertEqual(len(entries), 2)
        self.assertEqual(summary["total_income"], 1000.0)
        self.assertEqual(summary["total_expense"], 55.5)
        self.assertEqual(summary["balance"], 944.5)


if __name__ == "__main__":
    unittest.main()
