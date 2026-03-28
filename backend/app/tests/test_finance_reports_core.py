import os
import unittest
from datetime import date, datetime, timezone

os.environ["DEBUG"] = "true"
os.environ["APP_ENV"] = "test"

from app.apps.tenant_modules.finance.models.currency import FinanceCurrency  # noqa: E402
from app.apps.tenant_modules.finance.models.category import FinanceCategory  # noqa: E402
from app.apps.tenant_modules.finance.schemas import (  # noqa: E402
    FinanceBudgetCreateRequest,
    FinanceLoanCreateRequest,
    FinanceTransactionCreateRequest,
)
from app.apps.tenant_modules.finance.services import (  # noqa: E402
    FinanceBudgetService,
    FinanceLoanService,
    FinanceReportsService,
    FinanceService,
)
from app.common.db.tenant_base import TenantBase  # noqa: E402
from app.tests.db_test_utils import build_sqlite_session  # noqa: E402


class FinanceReportsCoreTestCase(unittest.TestCase):
    def setUp(self) -> None:
        self.db, self.engine = build_sqlite_session(TenantBase)
        self.finance_service = FinanceService()
        self.budget_service = FinanceBudgetService()
        self.loan_service = FinanceLoanService()
        self.reports_service = FinanceReportsService()

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

    def test_reports_overview_aggregates_transactions_budgets_and_loans(self) -> None:
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
                amount=300.0,
                discount_amount=0,
                exchange_rate=1,
                amortization_months=None,
                transaction_at=datetime(2026, 3, 6, tzinfo=timezone.utc),
                alternative_date=None,
                description="Venta marzo",
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
                amount=50.0,
                discount_amount=0,
                exchange_rate=1,
                amortization_months=None,
                transaction_at=datetime(2026, 3, 8, tzinfo=timezone.utc),
                alternative_date=None,
                description="Gasto marzo",
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
                transaction_at=datetime(2026, 4, 5, tzinfo=timezone.utc),
                alternative_date=None,
                description="Venta abril",
                notes=None,
                is_favorite=True,
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
                transaction_at=datetime(2026, 4, 7, tzinfo=timezone.utc),
                alternative_date=None,
                description="Gasto abril",
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
                period_month=date(2026, 3, 1),
                category_id=expense_category.id,
                amount=200.0,
                note=None,
                is_active=True,
            ),
        )
        self.budget_service.create_budget(
            self.db,
            FinanceBudgetCreateRequest(
                period_month=date(2026, 4, 1),
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
                current_balance=700.0,
                interest_rate=10.0,
                installments_count=5,
                payment_frequency="monthly",
                start_date=date(2026, 4, 1),
                due_date=date(2026, 8, 1),
                note=None,
                is_active=True,
            ),
        )

        overview = self.reports_service.get_overview(
            self.db,
            period_month=date(2026, 4, 15),
        )

        self.assertEqual(overview["period_month"], date(2026, 4, 1))
        self.assertEqual(overview["movement_scope"], "all")
        self.assertEqual(overview["budget_category_scope"], "all")
        self.assertEqual(overview["budget_status_filter"], "all")
        self.assertEqual(overview["transaction_snapshot"]["total_income"], 500.0)
        self.assertEqual(overview["transaction_snapshot"]["total_expense"], 120.0)
        self.assertEqual(overview["transaction_snapshot"]["net_balance"], 380.0)
        self.assertEqual(overview["transaction_snapshot"]["reconciled_count"], 1)
        self.assertEqual(overview["budget_snapshot"]["total_budgeted"], 300.0)
        self.assertEqual(overview["budget_snapshot"]["total_actual"], 120.0)
        self.assertEqual(overview["loan_snapshot"]["borrowed_balance"], 700.0)
        self.assertEqual(len(overview["top_income_categories"]), 1)
        self.assertEqual(overview["top_income_categories"][0]["category_name"], "General Income")
        self.assertEqual(len(overview["top_expense_categories"]), 1)
        self.assertEqual(overview["top_expense_categories"][0]["category_name"], "General Expense")
        self.assertEqual(len(overview["daily_cashflow"]), 2)
        self.assertEqual(overview["daily_cashflow"][0]["day"], date(2026, 4, 5))
        self.assertEqual(overview["daily_cashflow"][0]["income_total"], 500.0)
        self.assertEqual(overview["daily_cashflow"][0]["net_total"], 500.0)
        self.assertEqual(overview["daily_cashflow"][1]["day"], date(2026, 4, 7))
        self.assertEqual(overview["daily_cashflow"][1]["expense_total"], 120.0)
        self.assertEqual(len(overview["budget_variances"]), 1)
        self.assertEqual(
            overview["budget_variances"][0]["category_name"],
            "General Expense",
        )
        self.assertEqual(
            overview["budget_variances"][0]["budget_status"],
            "within_budget",
        )
        self.assertEqual(
            overview["budget_variances"][0]["variance_amount"],
            180.0,
        )
        self.assertEqual(
            overview["period_comparison"]["previous_period_month"],
            date(2026, 3, 1),
        )
        self.assertEqual(overview["period_comparison"]["previous_income"], 300.0)
        self.assertEqual(overview["period_comparison"]["previous_expense"], 50.0)
        self.assertEqual(overview["period_comparison"]["income_delta"], 200.0)
        self.assertEqual(overview["period_comparison"]["expense_delta"], 70.0)
        self.assertEqual(overview["period_comparison"]["transaction_delta"], 0)
        self.assertEqual(overview["period_comparison"]["budgeted_delta"], 100.0)
        self.assertEqual(len(overview["monthly_trend"]), 6)
        self.assertEqual(overview["monthly_trend"][-1]["period_month"], date(2026, 4, 1))
        self.assertEqual(overview["monthly_trend"][-1]["total_income"], 500.0)
        self.assertEqual(overview["monthly_trend"][-1]["total_expense"], 120.0)
        self.assertEqual(overview["monthly_trend"][-2]["period_month"], date(2026, 3, 1))
        self.assertEqual(overview["monthly_trend"][-2]["total_budgeted"], 200.0)
        self.assertEqual(overview["trend_summary"]["months_covered"], 6)
        self.assertEqual(overview["trend_summary"]["best_period_month"], date(2026, 4, 1))
        self.assertEqual(overview["trend_summary"]["best_net_balance"], 380.0)
        self.assertEqual(overview["trend_summary"]["worst_period_month"], date(2025, 11, 1))

    def test_reports_overview_respects_requested_trend_months(self) -> None:
        overview = self.reports_service.get_overview(
            self.db,
            period_month=date(2026, 4, 1),
            trend_months=3,
        )

        self.assertEqual(len(overview["monthly_trend"]), 3)

    def test_reports_overview_rejects_invalid_trend_months(self) -> None:
        with self.assertRaises(ValueError):
            self.reports_service.get_overview(
                self.db,
                period_month=date(2026, 4, 1),
                trend_months=5,
            )

    def test_reports_overview_filters_transactions_by_movement_scope(self) -> None:
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
                transaction_at=datetime(2026, 4, 5, tzinfo=timezone.utc),
                alternative_date=None,
                description="Venta abril",
                notes=None,
                is_favorite=True,
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
                transaction_at=datetime(2026, 4, 7, tzinfo=timezone.utc),
                alternative_date=None,
                description="Gasto abril",
                notes=None,
                is_favorite=False,
                is_reconciled=False,
                tag_ids=None,
            ),
            allow_accountless=True,
        )

        overview = self.reports_service.get_overview(
            self.db,
            period_month=date(2026, 4, 1),
            movement_scope="favorites",
        )

        self.assertEqual(overview["movement_scope"], "favorites")
        self.assertEqual(overview["transaction_snapshot"]["total_transactions"], 1)
        self.assertEqual(overview["transaction_snapshot"]["total_income"], 500.0)
        self.assertEqual(overview["transaction_snapshot"]["total_expense"], 0.0)
        self.assertEqual(len(overview["daily_cashflow"]), 1)
        self.assertEqual(len(overview["top_income_categories"]), 1)
        self.assertEqual(len(overview["top_expense_categories"]), 0)
        self.assertEqual(overview["monthly_trend"][-1]["total_transactions"], 1)

    def test_reports_overview_rejects_invalid_movement_scope(self) -> None:
        with self.assertRaises(ValueError):
            self.reports_service.get_overview(
                self.db,
                period_month=date(2026, 4, 1),
                movement_scope="invalid",
            )

    def test_reports_overview_filters_budgets_by_category_type(self) -> None:
        currency = self._seed_currency()
        income_category = self._seed_category("General Income", "income")
        expense_category = self._seed_category("General Expense", "expense")
        self.budget_service.create_budget(
            self.db,
            FinanceBudgetCreateRequest(
                period_month=date(2026, 4, 1),
                category_id=income_category.id,
                amount=900.0,
                note=None,
                is_active=True,
            ),
        )
        self.budget_service.create_budget(
            self.db,
            FinanceBudgetCreateRequest(
                period_month=date(2026, 4, 1),
                category_id=expense_category.id,
                amount=300.0,
                note=None,
                is_active=True,
            ),
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
                transaction_at=datetime(2026, 4, 7, tzinfo=timezone.utc),
                alternative_date=None,
                description="Gasto abril",
                notes=None,
                is_favorite=False,
                is_reconciled=False,
                tag_ids=None,
            ),
            allow_accountless=True,
        )

        overview = self.reports_service.get_overview(
            self.db,
            period_month=date(2026, 4, 1),
            budget_category_scope="expense",
        )

        self.assertEqual(overview["budget_category_scope"], "expense")
        self.assertEqual(overview["budget_snapshot"]["total_budgeted"], 300.0)
        self.assertEqual(overview["budget_snapshot"]["total_actual"], 120.0)
        self.assertEqual(len(overview["budget_variances"]), 1)
        self.assertEqual(overview["budget_variances"][0]["category_type"], "expense")

    def test_reports_overview_rejects_invalid_budget_filters(self) -> None:
        with self.assertRaises(ValueError):
            self.reports_service.get_overview(
                self.db,
                period_month=date(2026, 4, 1),
                budget_category_scope="invalid",
            )

        with self.assertRaises(ValueError):
            self.reports_service.get_overview(
                self.db,
                period_month=date(2026, 4, 1),
                budget_status_filter="invalid",
            )


if __name__ == "__main__":
    unittest.main()
