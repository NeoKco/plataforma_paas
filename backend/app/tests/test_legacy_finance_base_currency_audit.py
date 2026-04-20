import unittest

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import app.apps.tenant_modules.core.models  # noqa: F401
import app.apps.tenant_modules.finance.models  # noqa: F401
from app.apps.tenant_modules.finance.models.account import FinanceAccount  # noqa: E402
from app.apps.tenant_modules.finance.models.category import FinanceCategory  # noqa: E402
from app.apps.tenant_modules.finance.models.currency import FinanceCurrency  # noqa: E402
from app.apps.tenant_modules.finance.models.settings import FinanceSetting  # noqa: E402
from app.apps.tenant_modules.finance.models.transaction import FinanceTransaction  # noqa: E402
from app.common.db.tenant_base import TenantBase  # noqa: E402
from app.scripts.audit_legacy_finance_base_currency import (  # noqa: E402
    assess_legacy_finance_base_currency,
)


class LegacyFinanceBaseCurrencyAuditTestCase(unittest.TestCase):
    def setUp(self) -> None:
        self.engine = create_engine("sqlite+pysqlite:///:memory:", future=True)
        TenantBase.metadata.create_all(self.engine)
        self.session_factory = sessionmaker(bind=self.engine)

    def tearDown(self) -> None:
        TenantBase.metadata.drop_all(self.engine)
        self.engine.dispose()

    def _db(self):
        return self.session_factory()

    def test_assess_reports_ok_when_clp_is_base_and_setting_matches(self) -> None:
        db = self._db()
        try:
            clp = FinanceCurrency(
                code="CLP",
                name="Peso Chileno",
                symbol="$",
                decimal_places=0,
                is_base=True,
                is_active=True,
                sort_order=10,
            )
            db.add(clp)
            db.add(
                FinanceSetting(
                    setting_key="base_currency_code",
                    setting_value="CLP",
                    is_active=True,
                )
            )
            db.commit()

            result = assess_legacy_finance_base_currency(db)

            self.assertEqual(result["status"], "ok")
            self.assertEqual(result["recommendation"], "no_action")
            self.assertIsNone(result["audit_note"])
        finally:
            db.close()

    def test_assess_reports_manual_review_for_used_usd_legacy_base(self) -> None:
        db = self._db()
        try:
            usd = FinanceCurrency(
                code="USD",
                name="US Dollar",
                symbol="$",
                decimal_places=2,
                is_base=True,
                is_active=True,
                sort_order=10,
            )
            clp = FinanceCurrency(
                code="CLP",
                name="Peso Chileno",
                symbol="$",
                decimal_places=0,
                is_base=False,
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
            db.add(
                FinanceAccount(
                    name="Caja USD",
                    code="CAJA_USD",
                    account_type="cash",
                    currency_id=usd.id,
                    opening_balance=0,
                    is_active=True,
                    sort_order=10,
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
                    description="Ingreso legacy",
                    is_reconciled=False,
                    is_voided=False,
                )
            )
            db.commit()

            result = assess_legacy_finance_base_currency(db)

            self.assertEqual(result["status"], "warning")
            self.assertEqual(result["recommendation"], "manual_migration_review")
            self.assertEqual(result["audit_note"], "legacy_finance_base_currency:USD")
            self.assertEqual(result["base_currency_code"], "USD")
            self.assertEqual(result["base_setting_code"], "USD")
            self.assertEqual(result["transaction_counts_by_currency"], {"USD": 1})
            self.assertEqual(
                result["non_base_transaction_summary"]["missing_exchange_rate_count"],
                0,
            )
        finally:
            db.close()

    def test_assess_reports_safe_to_promote_clp_without_usage(self) -> None:
        db = self._db()
        try:
            usd = FinanceCurrency(
                code="USD",
                name="US Dollar",
                symbol="$",
                decimal_places=2,
                is_base=True,
                is_active=True,
                sort_order=10,
            )
            clp = FinanceCurrency(
                code="CLP",
                name="Peso Chileno",
                symbol="$",
                decimal_places=0,
                is_base=False,
                is_active=True,
                sort_order=20,
            )
            db.add_all([usd, clp])
            db.add(
                FinanceSetting(
                    setting_key="base_currency_code",
                    setting_value="USD",
                    is_active=True,
                )
            )
            db.commit()

            result = assess_legacy_finance_base_currency(db)

            self.assertEqual(result["status"], "warning")
            self.assertEqual(result["recommendation"], "promote_clp_without_usage")
            self.assertFalse(result["has_usage"])
            self.assertIsNone(result["audit_note"])
        finally:
            db.close()

    def test_assess_reports_repair_when_base_and_setting_do_not_match(self) -> None:
        db = self._db()
        try:
            usd = FinanceCurrency(
                code="USD",
                name="US Dollar",
                symbol="$",
                decimal_places=2,
                is_base=True,
                is_active=True,
                sort_order=10,
            )
            clp = FinanceCurrency(
                code="CLP",
                name="Peso Chileno",
                symbol="$",
                decimal_places=0,
                is_base=False,
                is_active=True,
                sort_order=20,
            )
            db.add_all([usd, clp])
            db.add(
                FinanceSetting(
                    setting_key="base_currency_code",
                    setting_value="CLP",
                    is_active=True,
                )
            )
            db.flush()
            db.add(
                FinanceAccount(
                    name="Caja USD",
                    code="CAJA_USD_MISMATCH",
                    account_type="cash",
                    currency_id=usd.id,
                    opening_balance=0,
                    is_active=True,
                    sort_order=10,
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
            db.commit()

            result = assess_legacy_finance_base_currency(db)

            self.assertEqual(result["status"], "warning")
            self.assertEqual(result["recommendation"], "repair_base_currency_setting_only")
            self.assertEqual(result["audit_note"], "finance_base_currency_mismatch:USD!=CLP")
        finally:
            db.close()

    def test_assess_reports_manual_review_when_mismatch_has_non_base_transactions_without_exchange_rate(self) -> None:
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

            result = assess_legacy_finance_base_currency(db)

            self.assertEqual(result["status"], "warning")
            self.assertEqual(result["recommendation"], "manual_migration_review")
            self.assertEqual(
                result["non_base_transaction_summary"]["missing_exchange_rate_count"],
                1,
            )
            self.assertEqual(
                result["non_base_transaction_summary"]["missing_base_amount_count"],
                1,
            )
        finally:
            db.close()


if __name__ == "__main__":
    unittest.main()
