import os
import unittest
from datetime import date, datetime, timezone

os.environ["DEBUG"] = "true"
os.environ["APP_ENV"] = "test"

from app.apps.tenant_modules.finance.models.account import FinanceAccount  # noqa: E402
from app.apps.tenant_modules.finance.models.currency import FinanceCurrency  # noqa: E402
from app.apps.tenant_modules.finance.schemas import (  # noqa: E402
    FinanceBudgetCloneRequest,
    FinanceBudgetCreateRequest,
    FinanceBudgetGuidedAdjustmentRequest,
    FinanceBudgetTemplateApplyRequest,
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

        rows, summary, focus_items = self.budget_service.list_budgets(
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
        self.assertEqual(summary["within_budget_items"], 1)
        self.assertEqual(summary["over_budget_items"], 0)
        self.assertEqual(len(focus_items), 1)
        self.assertEqual(focus_items[0]["category_name"], "Marketing")
        self.assertEqual(focus_items[0]["recommended_action"], "keep_tracking")

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

        over_budget_rows, over_budget_summary, _focus_items = self.budget_service.list_budgets(
            self.db,
            period_month=date(2026, 3, 1),
            include_inactive=True,
            budget_status="unused",
        )
        income_rows, income_summary, focus_items = self.budget_service.list_budgets(
            self.db,
            period_month=date(2026, 3, 1),
            include_inactive=True,
            category_type="income",
        )

        self.assertEqual(len(over_budget_rows), 1)
        self.assertEqual(over_budget_rows[0]["budget_status"], "unused")
        self.assertEqual(over_budget_summary["unused_items"], 1)
        self.assertEqual(len(income_rows), 1)
        self.assertEqual(income_rows[0]["category_type"], "income")
        self.assertEqual(income_summary["inactive_items"], 1)
        self.assertEqual(focus_items[0]["budget_status"], "inactive")
        self.assertEqual(focus_items[0]["recommended_action"], "activate_budget")

    def test_budget_focus_prioritizes_over_budget_before_other_statuses(self) -> None:
        currency = self._seed_currency()
        account = self._seed_account(currency.id)
        marketing = self._seed_category(name="Marketing", category_type="expense")
        operations = self._seed_category(name="Operación", category_type="expense")

        self.budget_service.create_budget(
            self.db,
            FinanceBudgetCreateRequest(
                period_month=date(2026, 3, 1),
                category_id=marketing.id,
                amount=100.0,
                note=None,
                is_active=True,
            ),
        )
        self.budget_service.create_budget(
            self.db,
            FinanceBudgetCreateRequest(
                period_month=date(2026, 3, 1),
                category_id=operations.id,
                amount=200.0,
                note=None,
                is_active=True,
            ),
        )
        self.finance_service.create_transaction(
            tenant_db=self.db,
            payload=FinanceTransactionCreateRequest(
                transaction_type="expense",
                account_id=account.id,
                target_account_id=None,
                category_id=marketing.id,
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
                description="Campaña alta",
                notes=None,
                is_favorite=False,
                is_reconciled=False,
                tag_ids=None,
            ),
            created_by_user_id=1,
        )

        _rows, summary, focus_items = self.budget_service.list_budgets(
            self.db,
            period_month=date(2026, 3, 1),
            include_inactive=True,
        )

        self.assertEqual(summary["over_budget_items"], 1)
        self.assertEqual(summary["unused_items"], 1)
        self.assertEqual(focus_items[0]["category_name"], "Marketing")
        self.assertEqual(focus_items[0]["budget_status"], "over_budget")
        self.assertEqual(focus_items[0]["recommended_action"], "adjust_amount")

    def test_clone_budgets_creates_missing_rows_in_target_month(self) -> None:
        self._seed_currency()
        marketing = self._seed_category(name="Marketing", category_type="expense")
        sales = self._seed_category(name="Ventas", category_type="income")

        self.budget_service.create_budget(
            self.db,
            FinanceBudgetCreateRequest(
                period_month=date(2026, 3, 1),
                category_id=marketing.id,
                amount=300.0,
                note="Marketing marzo",
                is_active=True,
            ),
        )
        self.budget_service.create_budget(
            self.db,
            FinanceBudgetCreateRequest(
                period_month=date(2026, 3, 1),
                category_id=sales.id,
                amount=800.0,
                note="Ventas marzo",
                is_active=False,
            ),
        )

        result = self.budget_service.clone_budgets(
            self.db,
            FinanceBudgetCloneRequest(
                source_period_month=date(2026, 3, 1),
                target_period_month=date(2026, 4, 1),
                overwrite_existing=False,
            ),
        )

        rows, summary, _focus_items = self.budget_service.list_budgets(
            self.db,
            period_month=date(2026, 4, 1),
            include_inactive=True,
        )

        self.assertEqual(result["cloned_count"], 2)
        self.assertEqual(result["updated_count"], 0)
        self.assertEqual(result["skipped_count"], 0)
        self.assertEqual(len(rows), 2)
        self.assertEqual(summary["total_items"], 2)
        self.assertEqual(rows[0]["budget"].period_month, date(2026, 4, 1))

    def test_clone_budgets_can_overwrite_existing_rows(self) -> None:
        self._seed_currency()
        marketing = self._seed_category(name="Marketing", category_type="expense")

        self.budget_service.create_budget(
            self.db,
            FinanceBudgetCreateRequest(
                period_month=date(2026, 3, 1),
                category_id=marketing.id,
                amount=300.0,
                note="Marketing marzo",
                is_active=True,
            ),
        )
        self.budget_service.create_budget(
            self.db,
            FinanceBudgetCreateRequest(
                period_month=date(2026, 4, 1),
                category_id=marketing.id,
                amount=120.0,
                note="Marketing abril",
                is_active=False,
            ),
        )

        skipped = self.budget_service.clone_budgets(
            self.db,
            FinanceBudgetCloneRequest(
                source_period_month=date(2026, 3, 1),
                target_period_month=date(2026, 4, 1),
                overwrite_existing=False,
            ),
        )
        self.assertEqual(skipped["cloned_count"], 0)
        self.assertEqual(skipped["updated_count"], 0)
        self.assertEqual(skipped["skipped_count"], 1)

        overwritten = self.budget_service.clone_budgets(
            self.db,
            FinanceBudgetCloneRequest(
                source_period_month=date(2026, 3, 1),
                target_period_month=date(2026, 4, 1),
                overwrite_existing=True,
            ),
        )
        rows, _summary, _focus_items = self.budget_service.list_budgets(
            self.db,
            period_month=date(2026, 4, 1),
            include_inactive=True,
        )

        self.assertEqual(overwritten["cloned_count"], 0)
        self.assertEqual(overwritten["updated_count"], 1)
        self.assertEqual(overwritten["skipped_count"], 0)
        self.assertEqual(rows[0]["budget"].amount, 300.0)
        self.assertTrue(rows[0]["budget"].is_active)

    def test_guided_adjustment_aligns_budget_to_actual_with_margin(self) -> None:
        currency = self._seed_currency()
        account = self._seed_account(currency.id)
        category = self._seed_category(name="Marketing", category_type="expense")

        budget = self.budget_service.create_budget(
            self.db,
            FinanceBudgetCreateRequest(
                period_month=date(2026, 3, 1),
                category_id=category.id,
                amount=100.0,
                note="Cap inicial",
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
                transaction_at=datetime(2026, 3, 15, tzinfo=timezone.utc),
                alternative_date=None,
                description="Campaña marzo",
                notes=None,
                is_favorite=False,
                is_reconciled=False,
                tag_ids=None,
            ),
            created_by_user_id=1,
        )

        updated_budget, adjustment_mode = self.budget_service.apply_guided_adjustment(
            self.db,
            budget.id,
            FinanceBudgetGuidedAdjustmentRequest(
                adjustment_mode="align_to_actual_with_margin",
                margin_percent=10.0,
            ),
        )

        self.assertEqual(adjustment_mode, "align_to_actual_with_margin")
        self.assertEqual(updated_budget.amount, 165.0)
        self.assertTrue(updated_budget.is_active)

    def test_guided_adjustment_can_deactivate_unused_budget(self) -> None:
        self._seed_currency()
        category = self._seed_category(name="Eventos", category_type="expense")

        budget = self.budget_service.create_budget(
            self.db,
            FinanceBudgetCreateRequest(
                period_month=date(2026, 3, 1),
                category_id=category.id,
                amount=80.0,
                note="Reserva",
                is_active=True,
            ),
        )

        updated_budget, adjustment_mode = self.budget_service.apply_guided_adjustment(
            self.db,
            budget.id,
            FinanceBudgetGuidedAdjustmentRequest(
                adjustment_mode="deactivate_unused",
            ),
        )

        self.assertEqual(adjustment_mode, "deactivate_unused")
        self.assertFalse(updated_budget.is_active)
        self.assertEqual(updated_budget.amount, 80.0)

    def test_apply_template_can_clone_previous_month_budgets(self) -> None:
        self._seed_currency()
        category = self._seed_category(name="Operación", category_type="expense")

        self.budget_service.create_budget(
            self.db,
            FinanceBudgetCreateRequest(
                period_month=date(2026, 2, 1),
                category_id=category.id,
                amount=420.0,
                note="Base febrero",
                is_active=True,
            ),
        )

        result = self.budget_service.apply_template(
            self.db,
            FinanceBudgetTemplateApplyRequest(
                target_period_month=date(2026, 3, 1),
                template_mode="previous_month",
                overwrite_existing=False,
            ),
        )

        rows, summary, _focus_items = self.budget_service.list_budgets(
            self.db,
            period_month=date(2026, 3, 1),
            include_inactive=True,
        )

        self.assertEqual(result["template_mode"], "previous_month")
        self.assertEqual(result["source_period_month"], date(2026, 2, 1))
        self.assertEqual(result["cloned_count"], 1)
        self.assertEqual(summary["total_budgeted"], 420.0)
        self.assertEqual(rows[0]["budget"].note, "Base febrero")

    def test_apply_template_can_seed_budget_from_three_month_average(self) -> None:
        currency = self._seed_currency()
        account = self._seed_account(currency.id)
        category = self._seed_category(name="Servicios", category_type="expense")

        for transaction_month, amount in ((3, 120.0), (4, 180.0), (5, 300.0)):
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
                    amount=amount,
                    discount_amount=0.0,
                    exchange_rate=1.0,
                    amortization_months=None,
                    transaction_at=datetime(2026, transaction_month, 15, tzinfo=timezone.utc),
                    alternative_date=None,
                    description=f"Mes {transaction_month}",
                    notes=None,
                    is_favorite=False,
                    is_reconciled=False,
                    tag_ids=None,
                ),
                created_by_user_id=1,
            )

        result = self.budget_service.apply_template(
            self.db,
            FinanceBudgetTemplateApplyRequest(
                target_period_month=date(2026, 6, 1),
                template_mode="rolling_actual_average_3m",
                overwrite_existing=False,
            ),
        )

        rows, summary, _focus_items = self.budget_service.list_budgets(
            self.db,
            period_month=date(2026, 6, 1),
            include_inactive=True,
        )

        self.assertEqual(result["template_mode"], "rolling_actual_average_3m")
        self.assertIsNone(result["source_period_month"])
        self.assertEqual(result["cloned_count"], 1)
        self.assertEqual(rows[0]["budget"].amount, 200.0)
        self.assertEqual(summary["total_budgeted"], 200.0)

    def test_apply_template_supports_scale_and_rounding(self) -> None:
        category = self._seed_category(name="Operación", category_type="expense")

        self.budget_service.create_budget(
            self.db,
            FinanceBudgetCreateRequest(
                period_month=date(2026, 2, 1),
                category_id=category.id,
                amount=420.0,
                note="Base febrero",
                is_active=True,
            ),
        )

        result = self.budget_service.apply_template(
            self.db,
            FinanceBudgetTemplateApplyRequest(
                target_period_month=date(2026, 3, 1),
                template_mode="previous_month",
                overwrite_existing=False,
                scale_percent=110.0,
                round_to_amount=50.0,
            ),
        )

        rows, summary, _focus_items = self.budget_service.list_budgets(
            self.db,
            period_month=date(2026, 3, 1),
            include_inactive=True,
        )

        self.assertEqual(result["scale_percent"], 110.0)
        self.assertEqual(result["round_to_amount"], 50.0)
        self.assertEqual(result["cloned_count"], 1)
        self.assertEqual(rows[0]["budget"].amount, 450.0)
        self.assertEqual(summary["total_budgeted"], 450.0)


if __name__ == "__main__":
    unittest.main()
