import os
import unittest
from datetime import date, datetime, timezone

os.environ["DEBUG"] = "true"
os.environ["APP_ENV"] = "test"

from app.apps.tenant_modules.finance.models.currency import FinanceCurrency  # noqa: E402
from app.apps.tenant_modules.finance.models.category import FinanceCategory  # noqa: E402
from app.apps.tenant_modules.finance.models.tag import FinanceTag  # noqa: E402
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

    def _seed_tag(self, name: str, sort_order: int = 10) -> FinanceTag:
        tag = FinanceTag(
            name=name,
            color=None,
            is_active=True,
            sort_order=sort_order,
        )
        self.db.add(tag)
        self.db.commit()
        self.db.refresh(tag)
        return tag

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
        self.assertEqual(overview["analysis_scope"], "period")
        self.assertEqual(overview["analysis_dimension"], "category")
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
        self.assertEqual(len(overview["top_income_breakdown"]), 1)
        self.assertEqual(overview["top_income_breakdown"][0]["entity_type"], "category")
        self.assertEqual(overview["top_income_breakdown"][0]["entity_name"], "General Income")
        self.assertEqual(len(overview["top_expense_breakdown"]), 1)
        self.assertEqual(overview["top_expense_breakdown"][0]["entity_name"], "General Expense")
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

    def test_reports_can_rank_breakdown_by_tag(self) -> None:
        currency = self._seed_currency()
        income_category = self._seed_category("Ventas", "income")
        vip_tag = self._seed_tag("VIP", sort_order=10)
        campaign_tag = self._seed_tag("Campaña", sort_order=20)

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
                amount=220.0,
                discount_amount=0,
                exchange_rate=1,
                amortization_months=None,
                transaction_at=datetime(2026, 4, 3, tzinfo=timezone.utc),
                alternative_date=None,
                description="Venta VIP",
                notes=None,
                is_favorite=False,
                is_reconciled=True,
                tag_ids=[vip_tag.id],
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
                amount=180.0,
                discount_amount=0,
                exchange_rate=1,
                amortization_months=None,
                transaction_at=datetime(2026, 4, 6, tzinfo=timezone.utc),
                alternative_date=None,
                description="Venta campaña",
                notes=None,
                is_favorite=False,
                is_reconciled=True,
                tag_ids=[campaign_tag.id, vip_tag.id],
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
                amount=50.0,
                discount_amount=0,
                exchange_rate=1,
                amortization_months=None,
                transaction_at=datetime(2026, 4, 8, tzinfo=timezone.utc),
                alternative_date=None,
                description="Venta sin tag",
                notes=None,
                is_favorite=False,
                is_reconciled=True,
                tag_ids=None,
            ),
            allow_accountless=True,
        )

        overview = self.reports_service.get_overview(
            self.db,
            period_month=date(2026, 4, 1),
            analysis_dimension="tag",
        )

        self.assertEqual(overview["analysis_dimension"], "tag")
        self.assertEqual(overview["top_income_breakdown"][0]["entity_type"], "tag")
        self.assertEqual(overview["top_income_breakdown"][0]["entity_name"], "VIP")
        self.assertEqual(overview["top_income_breakdown"][0]["total_amount"], 400.0)
        self.assertEqual(overview["top_income_breakdown"][1]["entity_name"], "Campaña")
        self.assertEqual(overview["top_income_breakdown"][1]["total_amount"], 180.0)
        self.assertEqual(
            overview["top_income_breakdown"][2]["entity_name"],
            "Sin etiqueta",
        )

    def test_reports_overview_respects_requested_trend_months(self) -> None:
        overview = self.reports_service.get_overview(
            self.db,
            period_month=date(2026, 4, 1),
            trend_months=3,
        )

        self.assertEqual(len(overview["monthly_trend"]), 3)

    def test_reports_overview_respects_requested_compare_period_month(self) -> None:
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
                period_month=date(2026, 2, 1),
                category_id=expense_category.id,
                amount=180.0,
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

        overview = self.reports_service.get_overview(
            self.db,
            period_month=date(2026, 4, 1),
            compare_period_month=date(2026, 2, 20),
        )

        self.assertEqual(
            overview["period_comparison"]["compare_period_month"],
            date(2026, 2, 1),
        )
        self.assertEqual(
            overview["period_comparison"]["previous_period_month"],
            date(2026, 2, 1),
        )
        self.assertEqual(overview["period_comparison"]["previous_income"], 0.0)
        self.assertEqual(overview["period_comparison"]["previous_expense"], 0.0)
        self.assertEqual(overview["period_comparison"]["income_delta"], 500.0)
        self.assertEqual(overview["period_comparison"]["expense_delta"], 120.0)
        self.assertEqual(overview["period_comparison"]["budgeted_delta"], 120.0)
        self.assertEqual(
            overview["horizon_comparison"]["compare_last_period_month"],
            date(2026, 2, 1),
        )
        self.assertEqual(
            overview["year_to_date_comparison"]["compare_last_period_month"],
            date(2026, 2, 1),
        )

    def test_reports_overview_filters_top_categories_by_analysis_scope(self) -> None:
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
            analysis_scope="horizon",
        )

        self.assertEqual(overview["analysis_scope"], "horizon")
        self.assertEqual(overview["top_income_categories"][0]["total_amount"], 800.0)
        self.assertEqual(overview["top_expense_categories"][0]["total_amount"], 120.0)

    def test_reports_overview_builds_breakdown_for_account_dimension(self) -> None:
        currency = self._seed_currency()
        income_category = self._seed_category("General Income", "income")
        expense_category = self._seed_category("General Expense", "expense")

        from app.apps.tenant_modules.finance.models.account import FinanceAccount

        account = FinanceAccount(
            name="Caja principal",
            code="CAJA",
            account_type="cash",
            currency_id=currency.id,
            parent_account_id=None,
            opening_balance=0.0,
            opening_balance_at=None,
            icon=None,
            is_favorite=False,
            is_balance_hidden=False,
            is_active=True,
            sort_order=10,
        )
        self.db.add(account)
        self.db.commit()
        self.db.refresh(account)

        self.finance_service.create_transaction(
            self.db,
            FinanceTransactionCreateRequest(
                transaction_type="income",
                account_id=account.id,
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
                account_id=account.id,
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
            analysis_dimension="account",
        )

        self.assertEqual(overview["analysis_dimension"], "account")
        self.assertEqual(overview["top_income_breakdown"][0]["entity_type"], "account")
        self.assertEqual(overview["top_income_breakdown"][0]["entity_name"], "Caja principal")
        self.assertEqual(overview["top_expense_breakdown"][0]["entity_name"], "Caja principal")

    def test_reports_overview_builds_custom_range_comparison(self) -> None:
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

        overview = self.reports_service.get_overview(
            self.db,
            period_month=date(2026, 4, 1),
            analysis_scope="period",
            custom_compare_start_month=date(2026, 3, 1),
            custom_compare_end_month=date(2026, 3, 1),
        )

        self.assertIsNotNone(overview["custom_range_comparison"])
        self.assertEqual(
            overview["custom_range_comparison"]["current_label"],
            "periodo",
        )
        self.assertEqual(
            overview["custom_range_comparison"]["custom_first_period_month"],
            date(2026, 3, 1),
        )
        self.assertEqual(
            overview["custom_range_comparison"]["total_income_delta_vs_custom"],
            200.0,
        )
        self.assertEqual(
            overview["custom_range_comparison"]["total_net_balance_delta_vs_custom"],
            130.0,
        )

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

        with self.assertRaises(ValueError):
            self.reports_service.get_overview(
                self.db,
                period_month=date(2026, 4, 1),
                analysis_scope="invalid",
            )

        with self.assertRaises(ValueError):
            self.reports_service.get_overview(
                self.db,
                period_month=date(2026, 4, 1),
                analysis_dimension="invalid",
            )

        with self.assertRaises(ValueError):
            self.reports_service.get_overview(
                self.db,
                period_month=date(2026, 4, 1),
                custom_compare_start_month=date(2026, 3, 1),
            )

        with self.assertRaises(ValueError):
            self.reports_service.get_overview(
                self.db,
                period_month=date(2026, 4, 1),
                custom_compare_start_month=date(2026, 4, 1),
                custom_compare_end_month=date(2026, 3, 1),
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
