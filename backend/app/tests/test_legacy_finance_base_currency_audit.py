import unittest
from datetime import date, datetime, timezone

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import app.apps.tenant_modules.core.models  # noqa: F401
import app.apps.tenant_modules.finance.models  # noqa: F401
from app.apps.tenant_modules.finance.models.account import FinanceAccount  # noqa: E402
from app.apps.tenant_modules.finance.models.category import FinanceCategory  # noqa: E402
from app.apps.tenant_modules.finance.models.currency import FinanceCurrency  # noqa: E402
from app.apps.tenant_modules.finance.models.exchange_rate import FinanceExchangeRate  # noqa: E402
from app.apps.tenant_modules.finance.models.loan import FinanceLoan  # noqa: E402
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
            self.assertEqual(result["migration_readiness"]["status"], "not_applicable")
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
            db.add(
                FinanceLoan(
                    name="Prestamo legado",
                    loan_type="receivable",
                    counterparty_name="Cliente demo",
                    currency_id=usd.id,
                    account_id=None,
                    principal_amount=100,
                    current_balance=80,
                    interest_rate=0,
                    installments_count=1,
                    payment_frequency="monthly",
                    start_date=date(2026, 1, 1),
                    due_date=None,
                    note=None,
                    is_active=True,
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
            self.assertEqual(result["loan_counts_by_currency"], {"USD": 1})
            self.assertEqual(
                result["legacy_base_transaction_summary"]["amount_matches_base_amount_count"],
                1,
            )
            self.assertEqual(result["migration_readiness"]["status"], "blocked")
            self.assertEqual(
                result["migration_readiness"]["legacy_base_account_summary"]["count"],
                1,
            )
            self.assertEqual(
                result["migration_readiness"]["legacy_base_transaction_summary"]["count"],
                1,
            )
            self.assertIn(
                "exchange_rate_pair_missing:USD<->CLP",
                result["migration_readiness"]["blockers"],
            )
            self.assertIn(
                "legacy_base_transactions_require_revaluation",
                result["migration_readiness"]["blockers"],
            )
            self.assertIn(
                "legacy_base_accounts_remain_in_usd",
                result["migration_readiness"]["blockers"],
            )
            self.assertIn(
                "legacy_base_loans_remain_in_usd",
                result["migration_readiness"]["blockers"],
            )
            self.assertEqual(
                result["migration_readiness"]["operator_inputs"],
                [
                    "historical_usd_to_clp_rate_policy",
                    "migration_effective_at",
                    "account_currency_policy",
                    "loan_currency_policy",
                ],
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
            self.assertEqual(result["migration_readiness"]["status"], "not_applicable")
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
            self.assertEqual(result["migration_readiness"]["status"], "not_applicable")
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
            self.assertEqual(result["migration_readiness"]["status"], "not_applicable")
        finally:
            db.close()

    def test_assess_reports_exchange_rate_support_when_legacy_usd_has_pair_configured(self) -> None:
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
                    name="Caja USD con tasa",
                    code="CAJA_USD_RATE",
                    account_type="cash",
                    currency_id=usd.id,
                    opening_balance=500,
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
                FinanceExchangeRate(
                    source_currency_id=usd.id,
                    target_currency_id=clp.id,
                    rate=950,
                    effective_at=datetime(2026, 1, 1, tzinfo=timezone.utc),
                    source="manual",
                    note=None,
                )
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
                    amount=200,
                    amount_in_base_currency=200,
                    exchange_rate=1,
                    description="Ingreso legacy con tasa disponible",
                    is_reconciled=False,
                    is_voided=False,
                )
            )
            db.commit()

            result = assess_legacy_finance_base_currency(db)

            self.assertEqual(result["recommendation"], "manual_migration_review")
            self.assertEqual(result["migration_readiness"]["status"], "blocked")
            self.assertEqual(
                result["migration_readiness"]["exchange_rate_pair_summary"]["direct_count"],
                1,
            )
            self.assertNotIn(
                "exchange_rate_pair_missing:USD<->CLP",
                result["migration_readiness"]["blockers"],
            )
            self.assertIn(
                "legacy_base_transactions_require_revaluation",
                result["migration_readiness"]["blockers"],
            )
        finally:
            db.close()

    def test_assess_reports_accepted_legacy_coexistence_for_explicit_tenant_policy(self) -> None:
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
                    name="Caja USD aceptada",
                    code="CAJA_USD_ACCEPTED",
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
                FinanceExchangeRate(
                    source_currency_id=usd.id,
                    target_currency_id=clp.id,
                    rate=950,
                    effective_at=datetime(2026, 1, 1, tzinfo=timezone.utc),
                    source="manual",
                    note=None,
                )
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
                    amount=200,
                    amount_in_base_currency=200,
                    exchange_rate=1,
                    description="Ingreso legacy aceptado",
                    is_reconciled=False,
                    is_voided=False,
                )
            )
            db.add(
                FinanceLoan(
                    name="Prestamo legacy aceptado",
                    loan_type="receivable",
                    counterparty_name="Cliente demo",
                    currency_id=usd.id,
                    account_id=None,
                    principal_amount=100,
                    current_balance=90,
                    interest_rate=0,
                    installments_count=2,
                    payment_frequency="monthly",
                    start_date=date(2026, 1, 1),
                    due_date=None,
                    note=None,
                    is_active=True,
                )
            )
            db.commit()

            result = assess_legacy_finance_base_currency(
                db,
                tenant_slug="empresa-bootstrap",
            )

            self.assertEqual(result["status"], "ok")
            self.assertEqual(result["recommendation"], "accepted_legacy_coexistence")
            self.assertEqual(
                result["audit_note"],
                "accepted_legacy_finance_base_currency:USD",
            )
            self.assertEqual(result["migration_readiness"]["status"], "accepted_legacy")
            self.assertEqual(
                result["migration_readiness"]["accepted_policy"],
                {
                    "tenant_slug": "empresa-bootstrap",
                    "currency_code": "USD",
                    "policy_code": "accepted_legacy_coexistence",
                    "reason": "baseline_e2e_tenant",
                },
            )
            self.assertIn(
                "legacy_base_transactions_require_revaluation",
                result["migration_readiness"]["blockers"],
            )
            self.assertIn(
                "legacy_base_loans_remain_in_usd",
                result["migration_readiness"]["blockers"],
            )
        finally:
            db.close()


if __name__ == "__main__":
    unittest.main()
