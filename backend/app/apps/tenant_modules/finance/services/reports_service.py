from datetime import date, datetime, time, timedelta, timezone

from sqlalchemy.orm import Session

from app.apps.tenant_modules.finance.repositories import (
    FinanceCategoryRepository,
    FinanceTransactionRepository,
)
from app.apps.tenant_modules.finance.services.budget_service import FinanceBudgetService
from app.apps.tenant_modules.finance.services.loan_service import FinanceLoanService


class FinanceReportsService:
    def __init__(
        self,
        transaction_repository: FinanceTransactionRepository | None = None,
        category_repository: FinanceCategoryRepository | None = None,
        budget_service: FinanceBudgetService | None = None,
        loan_service: FinanceLoanService | None = None,
    ) -> None:
        self.transaction_repository = (
            transaction_repository or FinanceTransactionRepository()
        )
        self.category_repository = category_repository or FinanceCategoryRepository()
        self.budget_service = budget_service or FinanceBudgetService()
        self.loan_service = loan_service or FinanceLoanService()

    def get_overview(
        self,
        tenant_db: Session,
        *,
        period_month: date,
    ) -> dict:
        normalized_period_month = period_month.replace(day=1)
        starts_at = self._month_start(normalized_period_month)
        ends_at = self._next_month_start(normalized_period_month)

        categories = {
            category.id: category
            for category in self.category_repository.list_all(
                tenant_db, include_inactive=True
            )
        }
        transactions = [
            transaction
            for transaction in self.transaction_repository.list_all(tenant_db)
            if starts_at <= self._normalize_datetime(transaction.transaction_at) < ends_at
        ]
        budget_rows, budget_summary = self.budget_service.list_budgets(
            tenant_db,
            period_month=normalized_period_month,
            include_inactive=True,
        )
        loan_rows, loan_summary = self.loan_service.list_loans(
            tenant_db,
            include_inactive=True,
        )

        income_transactions = [
            transaction
            for transaction in transactions
            if transaction.transaction_type == "income"
        ]
        expense_transactions = [
            transaction
            for transaction in transactions
            if transaction.transaction_type == "expense"
        ]

        transaction_snapshot = {
            "period_month": normalized_period_month,
            "total_income": round(sum(item.amount for item in income_transactions), 2),
            "total_expense": round(sum(item.amount for item in expense_transactions), 2),
            "net_balance": round(
                sum(item.amount for item in income_transactions)
                - sum(item.amount for item in expense_transactions),
                2,
            ),
            "total_transactions": len(transactions),
            "reconciled_count": len(
                [transaction for transaction in transactions if transaction.is_reconciled]
            ),
            "unreconciled_count": len(
                [transaction for transaction in transactions if not transaction.is_reconciled]
            ),
            "favorite_count": len(
                [transaction for transaction in transactions if transaction.is_favorite]
            ),
            "loan_linked_count": len(
                [transaction for transaction in transactions if transaction.loan_id is not None]
            ),
        }
        budget_snapshot = {
            "period_month": normalized_period_month,
            "total_budgeted": round(float(budget_summary["total_budgeted"]), 2),
            "total_actual": round(float(budget_summary["total_actual"]), 2),
            "total_variance": round(float(budget_summary["total_variance"]), 2),
            "total_items": int(budget_summary["total_items"]),
            "over_budget_count": len(
                [row for row in budget_rows if row["budget_status"] == "over_budget"]
            ),
            "within_budget_count": len(
                [row for row in budget_rows if row["budget_status"] == "within_budget"]
            ),
            "inactive_count": len(
                [row for row in budget_rows if row["budget_status"] == "inactive"]
            ),
            "unused_count": len(
                [row for row in budget_rows if row["budget_status"] == "unused"]
            ),
        }
        loan_snapshot = {
            "borrowed_balance": round(float(loan_summary["borrowed_balance"]), 2),
            "lent_balance": round(float(loan_summary["lent_balance"]), 2),
            "total_principal": round(float(loan_summary["total_principal"]), 2),
            "total_items": len(loan_rows),
            "active_items": int(loan_summary["active_items"]),
            "open_items": len(
                [row for row in loan_rows if row["loan_status"] == "open"]
            ),
            "settled_items": len(
                [row for row in loan_rows if row["loan_status"] == "settled"]
            ),
        }

        return {
            "period_month": normalized_period_month,
            "transaction_snapshot": transaction_snapshot,
            "budget_snapshot": budget_snapshot,
            "loan_snapshot": loan_snapshot,
            "top_income_categories": self._build_top_categories(
                transactions=income_transactions,
                categories=categories,
                category_type="income",
            ),
            "top_expense_categories": self._build_top_categories(
                transactions=expense_transactions,
                categories=categories,
                category_type="expense",
            ),
        }

    def _build_top_categories(
        self,
        *,
        transactions: list,
        categories: dict,
        category_type: str,
    ) -> list[dict]:
        totals_by_category: dict[int, float] = {}
        for transaction in transactions:
            if transaction.category_id is None:
                continue
            totals_by_category[transaction.category_id] = round(
                totals_by_category.get(transaction.category_id, 0.0) + float(transaction.amount),
                2,
            )

        rows: list[dict] = []
        for category_id, total_amount in totals_by_category.items():
            category = categories.get(category_id)
            if category is None:
                continue
            rows.append(
                {
                    "category_id": category_id,
                    "category_name": category.name,
                    "category_type": category_type,
                    "total_amount": round(total_amount, 2),
                }
            )
        rows.sort(key=lambda item: (-item["total_amount"], item["category_name"]))
        return rows[:5]

    def _month_start(self, period_month: date) -> datetime:
        return datetime.combine(period_month, time.min, tzinfo=timezone.utc)

    def _next_month_start(self, period_month: date) -> datetime:
        provisional = period_month.replace(day=28) + timedelta(days=4)
        next_month = provisional.replace(day=1)
        return datetime.combine(next_month, time.min, tzinfo=timezone.utc)

    def _normalize_datetime(self, value: datetime) -> datetime:
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value
