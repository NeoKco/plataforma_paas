import unittest

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import app.apps.tenant_modules.core.models  # noqa: F401
import app.apps.tenant_modules.finance.models  # noqa: F401
from app.apps.tenant_modules.finance.models.category import FinanceCategory  # noqa: E402
from app.apps.tenant_modules.finance.models.currency import FinanceCurrency  # noqa: E402
from app.apps.tenant_modules.finance.models.settings import FinanceSetting  # noqa: E402
from app.apps.tenant_modules.finance.models.transaction import FinanceTransaction  # noqa: E402
from app.common.db.tenant_base import TenantBase  # noqa: E402
from app.scripts.repair_finance_base_currency_mismatch import (  # noqa: E402
    repair_base_currency_setting_to_effective_base,
)


class RepairFinanceBaseCurrencyMismatchTestCase(unittest.TestCase):
    def setUp(self) -> None:
        self.engine = create_engine("sqlite+pysqlite:///:memory:", future=True)
        TenantBase.metadata.create_all(self.engine)
        self.session_factory = sessionmaker(bind=self.engine)

    def tearDown(self) -> None:
        TenantBase.metadata.drop_all(self.engine)
        self.engine.dispose()

    def _db(self):
        return self.session_factory()

    def test_repairs_setting_when_mismatch_is_metadata_only(self) -> None:
        db = self._db()
        try:
            usd = FinanceCurrency(
                code="USD",
                name="US Dollar",
                symbol="$",
                decimal_places=2,
                is_base=False,
                is_active=True,
                sort_order=10,
            )
            clp = FinanceCurrency(
                code="CLP",
                name="Peso Chileno",
                symbol="$",
                decimal_places=0,
                is_base=True,
                is_active=True,
                sort_order=20,
            )
            db.add_all([usd, clp])
            db.flush()
            db.add(
                FinanceSetting(
                    setting_key="base_currency_code",
                    setting_value="USD",
                    is_active=True,
                )
            )
            db.add_all(
                [
                    FinanceCategory(
                        name="Ingreso General",
                        category_type="income",
                        is_active=True,
                        sort_order=10,
                    ),
                    FinanceCategory(
                        name="Mantenciones y servicios",
                        category_type="expense",
                        is_active=True,
                        sort_order=20,
                    ),
                ]
            )
            db.add(
                FinanceTransaction(
                    transaction_type="income",
                    account_id=None,
                    target_account_id=None,
                    category_id=None,
                    beneficiary_id=None,
                    person_id=None,
                    project_id=None,
                    currency_id=usd.id,
                    amount=100,
                    amount_in_base_currency=100,
                    exchange_rate=1,
                    description="Ingreso consistente",
                    is_reconciled=False,
                    is_voided=False,
                )
            )
            db.commit()

            previous_value, target_code = repair_base_currency_setting_to_effective_base(db)

            self.assertEqual(previous_value, "USD")
            self.assertEqual(target_code, "CLP")
            setting = (
                db.query(FinanceSetting)
                .filter(FinanceSetting.setting_key == "base_currency_code")
                .one()
            )
            self.assertEqual(setting.setting_value, "CLP")
        finally:
            db.close()

    def test_refuses_repair_when_mismatch_requires_manual_review(self) -> None:
        db = self._db()
        try:
            usd = FinanceCurrency(
                code="USD",
                name="US Dollar",
                symbol="$",
                decimal_places=2,
                is_base=False,
                is_active=True,
                sort_order=10,
            )
            clp = FinanceCurrency(
                code="CLP",
                name="Peso Chileno",
                symbol="$",
                decimal_places=0,
                is_base=True,
                is_active=True,
                sort_order=20,
            )
            db.add_all([usd, clp])
            db.flush()
            db.add(
                FinanceSetting(
                    setting_key="base_currency_code",
                    setting_value="USD",
                    is_active=True,
                )
            )
            db.add_all(
                [
                    FinanceCategory(
                        name="Ingreso General",
                        category_type="income",
                        is_active=True,
                        sort_order=10,
                    ),
                    FinanceCategory(
                        name="Mantenciones y servicios",
                        category_type="expense",
                        is_active=True,
                        sort_order=20,
                    ),
                ]
            )
            db.add(
                FinanceTransaction(
                    transaction_type="income",
                    account_id=None,
                    target_account_id=None,
                    category_id=None,
                    beneficiary_id=None,
                    person_id=None,
                    project_id=None,
                    currency_id=usd.id,
                    amount=100,
                    amount_in_base_currency=None,
                    exchange_rate=None,
                    description="Ingreso inconsistente",
                    is_reconciled=False,
                    is_voided=False,
                )
            )
            db.commit()

            with self.assertRaisesRegex(ValueError, "recommendation=manual_migration_review"):
                repair_base_currency_setting_to_effective_base(db)
        finally:
            db.close()


if __name__ == "__main__":
    unittest.main()
