import os
import unittest
from datetime import date, datetime, timezone

os.environ["DEBUG"] = "true"
os.environ["APP_ENV"] = "test"

from app.apps.tenant_modules.finance.models.account import FinanceAccount  # noqa: E402
from app.apps.tenant_modules.finance.models.currency import FinanceCurrency  # noqa: E402
from app.apps.tenant_modules.finance.schemas import (  # noqa: E402
    FinanceBudgetCreateRequest,
    FinanceTransactionCreateRequest,
)
from app.apps.tenant_modules.finance.services.budget_service import (  # noqa: E402
    FinanceBudgetService,
)
from app.apps.tenant_modules.finance.services.finance_service import FinanceService  # noqa: E402
from app.common.db.tenant_base import TenantBase  # noqa: E402
from app.tests.db_test_utils import build_sqlite_session  # noqa: E402


class FinanceBudgetCoreTestCase(unittest.TestCase):
    def setUp(self) -> None:
        self.db, self.engine = build_sqlite_session(TenantBase)
        self.finance_service = FinanceService()
        self.budget_service = FinanceBudgetService()

    def tearDown(self) -> None:
        self.db.close()
        self.engine.dispose()

    def _seed_currency(self) -> FinanceCurrency:
        currency = FinanceCurrency(
            code="USD",
            name="USD",
            symbol="$",
            decimal_places=2,
            is_base=True,
            is_active=True,
            sort_order=10,
        )
        self.db.add(currency)
        self.db.commit()
        self.db.refresh(currency)
        return currency

    def _seed_account(self, currency_id: int) -> FinanceAccount:
        account = FinanceAccount(
            name="Caja",
            code="CAJA",
            account_type="cash",
            currency_id=currency_id,
            opening_balance=0.0,
            is_active=True,
            sort_order=10,
        )
        self.db.add(account)
        self.db.commit()
        self.db.refresh(account)
        return account

    def _seed_category(self, *, name: str, category_type: str):
        category_table = TenantBase.metadata.tables["finance_categories"]
        with self.engine.begin() as conn:
            result = conn.execute(
                category_table.insert().values(
                    name=name,
                    category_type=category_type,
                    parent_category_id=None,
                    icon=None,
                    color=None,
                    note=None,
                    is_active=True,
                    sort_order=10,
                )
            )
            category_id = result.inserted_primary_key[0]
        class CategoryStub:
            id = category_id
        return CategoryStub()

    def test_budget_compares_budgeted_vs_actual_for_month(self) -> None:
        currency = self._seed_currency()
        account = self._seed_account(currency.id)
        category = self._seed_category(name="Marketing", category_type="expense")

        self.budget_service.create_budget(
            self.db,
            FinanceBudgetCreateRequest(
                period_month=date(2026, 3, 18),
                category_id=category.id,
                amount=500.0,
                note="Campaña marzo",
                is_active=True,
            ),
        )
        self.finance_service.create_transaction(
            tenant_db=self.db,
            payload=FinanceTransactionCreateRequest(
                transaction_type="expense",
                account_id=account.id,
                target_account_id=None,
                category_id=category.id,
                beneficiary_id=None,
                person_id=None,
                project_id=None,
                currency_id=currency.id,
                loan_id=None,
                amount=150.0,
                discount_amount=0.0,
                exchange_rate=1.0,
                amortization_months=None,
                transaction_at=datetime(2026, 3, 12, tzinfo=timezone.utc),
                alternative_date=None,
                description="Campaña digital",
                notes=None,
                is_favorite=False,
                is_reconciled=False,
                tag_ids=None,
            ),
            created_by_user_id=1,
        )

        rows, summary = self.budget_service.list_budgets(
            self.db,
            period_month=date(2026, 3, 1),
            include_inactive=True,
        )

        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["category_name"], "Marketing")
        self.assertEqual(rows[0]["actual_amount"], 150.0)
        self.assertEqual(rows[0]["variance_amount"], 350.0)
        self.assertAlmostEqual(rows[0]["utilization_ratio"], 0.3, places=6)
        self.assertEqual(rows[0]["budget_status"], "within_budget")
        self.assertEqual(summary["total_budgeted"], 500.0)
        self.assertEqual(summary["total_actual"], 150.0)
        self.assertEqual(summary["expense_budgeted"], 500.0)
        self.assertEqual(summary["expense_actual"], 150.0)
        self.assertEqual(summary["income_budgeted"], 0.0)
        self.assertEqual(summary["income_actual"], 0.0)

    def test_budget_filters_support_status_and_category_type(self) -> None:
        self._seed_currency()
        expense_category = self._seed_category(name="Operación", category_type="expense")
        income_category = self._seed_category(name="Ventas", category_type="income")

        self.budget_service.create_budget(
            self.db,
            FinanceBudgetCreateRequest(
                period_month=date(2026, 3, 1),
                category_id=expense_category.id,
                amount=100.0,
                note=None,
                is_active=True,
            ),
        )
        self.budget_service.create_budget(
            self.db,
            FinanceBudgetCreateRequest(
                period_month=date(2026, 3, 1),
                category_id=income_category.id,
                amount=250.0,
                note=None,
                is_active=False,
            ),
        )

        over_budget_rows, _summary = self.budget_service.list_budgets(
            self.db,
            period_month=date(2026, 3, 1),
            include_inactive=True,
            budget_status="unused",
        )
        income_rows, _summary = self.budget_service.list_budgets(
            self.db,
            period_month=date(2026, 3, 1),
            include_inactive=True,
            category_type="income",
        )

        self.assertEqual(len(over_budget_rows), 1)
        self.assertEqual(over_budget_rows[0]["budget_status"], "unused")
        self.assertEqual(len(income_rows), 1)
        self.assertEqual(income_rows[0]["category_type"], "income")


if __name__ == "__main__":
    unittest.main()
