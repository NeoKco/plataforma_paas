import os
import unittest
from datetime import date, datetime, timezone

os.environ["DEBUG"] = "true"
os.environ["APP_ENV"] = "test"

from app.apps.tenant_modules.finance.models.category import FinanceCategory  # noqa: E402
from app.apps.tenant_modules.finance.models.currency import FinanceCurrency  # noqa: E402
from app.apps.tenant_modules.finance.schemas import (  # noqa: E402
    FinanceBudgetCreateRequest,
    FinanceLoanCreateRequest,
    FinanceTransactionCreateRequest,
)
from app.apps.tenant_modules.finance.services import (  # noqa: E402
    FinanceBudgetService,
    FinanceLoanService,
    FinancePlanningService,
    FinanceService,
)
from app.common.db.tenant_base import TenantBase  # noqa: E402
from app.tests.db_test_utils import build_sqlite_session  # noqa: E402


class FinancePlanningCoreTestCase(unittest.TestCase):
    def setUp(self) -> None:
        self.db, self.engine = build_sqlite_session(TenantBase)
        self.finance_service = FinanceService()
        self.budget_service = FinanceBudgetService()
        self.loan_service = FinanceLoanService()
        self.planning_service = FinancePlanningService()

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

    def _seed_category(self, name: str, category_type: str) -> FinanceCategory:
        category = FinanceCategory(
            name=name,
            category_type=category_type,
            parent_category_id=None,
            icon=None,
            color=None,
            note=None,
            is_active=True,
            sort_order=10,
        )
        self.db.add(category)
        self.db.commit()
        self.db.refresh(category)
        return category

    def test_planning_overview_builds_calendar_budget_focus_and_due_loans(self) -> None:
        currency = self._seed_currency()
        income_category = self._seed_category("General Income", "income")
        expense_category = self._seed_category("General Expense", "expense")

        self.finance_service.create_transaction(
            self.db,
            FinanceTransactionCreateRequest(
                transaction_type="income",
                account_id=None,
                target_account_id=None,
                category_id=income_category.id,
                beneficiary_id=None,
                person_id=None,
                project_id=None,
                currency_id=currency.id,
                loan_id=None,
                amount=500.0,
                discount_amount=0,
                exchange_rate=1,
                amortization_months=None,
                transaction_at=datetime(2026, 5, 3, tzinfo=timezone.utc),
                alternative_date=None,
                description="Venta mayo",
                notes=None,
                is_favorite=False,
                is_reconciled=True,
                tag_ids=None,
            ),
            allow_accountless=True,
        )
        self.finance_service.create_transaction(
            self.db,
            FinanceTransactionCreateRequest(
                transaction_type="expense",
                account_id=None,
                target_account_id=None,
                category_id=expense_category.id,
                beneficiary_id=None,
                person_id=None,
                project_id=None,
                currency_id=currency.id,
                loan_id=None,
                amount=120.0,
                discount_amount=0,
                exchange_rate=1,
                amortization_months=None,
                transaction_at=datetime(2026, 5, 5, tzinfo=timezone.utc),
                alternative_date=None,
                description="Gasto mayo",
                notes=None,
                is_favorite=False,
                is_reconciled=False,
                tag_ids=None,
            ),
            allow_accountless=True,
        )
        self.budget_service.create_budget(
            self.db,
            FinanceBudgetCreateRequest(
                period_month=date(2026, 5, 1),
                category_id=expense_category.id,
                amount=300.0,
                note=None,
                is_active=True,
            ),
        )
        self.loan_service.create_loan(
            self.db,
            FinanceLoanCreateRequest(
                name="Prestamo operativo",
                loan_type="borrowed",
                counterparty_name="Banco Uno",
                currency_id=currency.id,
                principal_amount=1000.0,
                current_balance=1000.0,
                interest_rate=10.0,
                installments_count=5,
                payment_frequency="monthly",
                start_date=date(2026, 5, 1),
                due_date=date(2026, 9, 1),
                note=None,
                is_active=True,
            ),
        )

        overview = self.planning_service.get_monthly_overview(
            self.db,
            period_month=date(2026, 5, 15),
        )

        self.assertEqual(overview["period_month"], date(2026, 5, 1))
        self.assertEqual(overview["summary"]["total_income"], 500.0)
        self.assertEqual(overview["summary"]["total_expense"], 120.0)
        self.assertEqual(overview["summary"]["due_installments_count"], 1)
        self.assertEqual(overview["summary"]["pending_installments_count"], 1)
        self.assertEqual(len(overview["calendar_days"]), 3)
        self.assertEqual(overview["calendar_days"][0]["day"], date(2026, 5, 1))
        self.assertEqual(overview["calendar_days"][1]["day"], date(2026, 5, 3))
        self.assertEqual(len(overview["loan_due_items"]), 1)
        self.assertEqual(overview["loan_due_items"][0]["loan_name"], "Prestamo operativo")
        self.assertEqual(len(overview["budget_focus"]), 1)
        self.assertEqual(overview["budget_focus"][0]["category_name"], "General Expense")


if __name__ == "__main__":
    unittest.main()
