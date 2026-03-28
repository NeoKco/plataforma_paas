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
        previous_period_month = self._previous_month_start(normalized_period_month)
        previous_starts_at = self._month_start(previous_period_month)
        previous_ends_at = self._next_month_start(previous_period_month)

        categories = {
            category.id: category
            for category in self.category_repository.list_all(
                tenant_db, include_inactive=True
            )
        }
        all_transactions = self.transaction_repository.list_all(tenant_db)
        transactions = [
            transaction
            for transaction in all_transactions
            if starts_at <= self._normalize_datetime(transaction.transaction_at) < ends_at
        ]
        previous_transactions = [
            transaction
            for transaction in all_transactions
            if previous_starts_at
            <= self._normalize_datetime(transaction.transaction_at)
            < previous_ends_at
        ]
        budget_rows, budget_summary = self.budget_service.list_budgets(
            tenant_db,
            period_month=normalized_period_month,
            include_inactive=True,
        )
        _, previous_budget_summary = self.budget_service.list_budgets(
            tenant_db,
            period_month=previous_period_month,
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
        previous_income_transactions = [
            transaction
            for transaction in previous_transactions
            if transaction.transaction_type == "income"
        ]
        previous_expense_transactions = [
            transaction
            for transaction in previous_transactions
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
            "daily_cashflow": self._build_daily_cashflow(transactions=transactions),
            "budget_variances": self._build_budget_variances(budget_rows=budget_rows),
            "period_comparison": {
                "current_period_month": normalized_period_month,
                "previous_period_month": previous_period_month,
                "previous_income": round(
                    sum(item.amount for item in previous_income_transactions), 2
                ),
                "previous_expense": round(
                    sum(item.amount for item in previous_expense_transactions), 2
                ),
                "previous_net_balance": round(
                    sum(item.amount for item in previous_income_transactions)
                    - sum(item.amount for item in previous_expense_transactions),
                    2,
                ),
                "previous_transactions": len(previous_transactions),
                "previous_budgeted": round(
                    float(previous_budget_summary["total_budgeted"]), 2
                ),
                "previous_actual": round(
                    float(previous_budget_summary["total_actual"]), 2
                ),
                "previous_variance": round(
                    float(previous_budget_summary["total_variance"]), 2
                ),
                "income_delta": round(
                    transaction_snapshot["total_income"]
                    - sum(item.amount for item in previous_income_transactions),
                    2,
                ),
                "expense_delta": round(
                    transaction_snapshot["total_expense"]
                    - sum(item.amount for item in previous_expense_transactions),
                    2,
                ),
                "net_balance_delta": round(
                    transaction_snapshot["net_balance"]
                    - (
                        sum(item.amount for item in previous_income_transactions)
                        - sum(item.amount for item in previous_expense_transactions)
                    ),
                    2,
                ),
                "transaction_delta": int(
                    transaction_snapshot["total_transactions"] - len(previous_transactions)
                ),
                "budgeted_delta": round(
                    budget_snapshot["total_budgeted"]
                    - float(previous_budget_summary["total_budgeted"]),
                    2,
                ),
                "actual_delta": round(
                    budget_snapshot["total_actual"]
                    - float(previous_budget_summary["total_actual"]),
                    2,
                ),
                "variance_delta": round(
                    budget_snapshot["total_variance"]
                    - float(previous_budget_summary["total_variance"]),
                    2,
                ),
            },
            "monthly_trend": self._build_monthly_trend(
                tenant_db=tenant_db,
                all_transactions=all_transactions,
                current_period_month=normalized_period_month,
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

    def _build_daily_cashflow(
        self,
        *,
        transactions: list,
    ) -> list[dict]:
        totals_by_day: dict[date, dict[str, float | int]] = {}

        for transaction in transactions:
            day = self._normalize_datetime(transaction.transaction_at).date()
            bucket = totals_by_day.setdefault(
                day,
                {
                    "income_total": 0.0,
                    "expense_total": 0.0,
                    "transaction_count": 0,
                },
            )
            amount = round(float(transaction.amount), 2)
            if transaction.transaction_type == "income":
                bucket["income_total"] = round(bucket["income_total"] + amount, 2)
            elif transaction.transaction_type == "expense":
                bucket["expense_total"] = round(bucket["expense_total"] + amount, 2)
            bucket["transaction_count"] = int(bucket["transaction_count"]) + 1

        rows: list[dict] = []
        for day, bucket in sorted(totals_by_day.items()):
            income_total = round(float(bucket["income_total"]), 2)
            expense_total = round(float(bucket["expense_total"]), 2)
            rows.append(
                {
                    "day": day,
                    "income_total": income_total,
                    "expense_total": expense_total,
                    "net_total": round(income_total - expense_total, 2),
                    "transaction_count": int(bucket["transaction_count"]),
                }
            )
        return rows

    def _build_budget_variances(
        self,
        *,
        budget_rows: list[dict],
    ) -> list[dict]:
        rows: list[dict] = []
        for row in budget_rows:
            budget = row["budget"]
            rows.append(
                {
                    "category_id": budget.category_id,
                    "category_name": row["category_name"],
                    "category_type": row["category_type"],
                    "budget_status": row["budget_status"],
                    "planned_amount": round(float(budget.amount), 2),
                    "actual_amount": round(float(row["actual_amount"]), 2),
                    "variance_amount": round(float(row["variance_amount"]), 2),
                    "utilization_ratio": (
                        None
                        if row["utilization_ratio"] is None
                        else round(float(row["utilization_ratio"]), 4)
                    ),
                    "is_active": bool(budget.is_active),
                }
            )

        rows.sort(
            key=lambda item: (
                -self._budget_status_priority(item["budget_status"]),
                -abs(float(item["variance_amount"])),
                item["category_name"].lower(),
            )
        )
        return rows[:8]

    def _budget_status_priority(self, status: str) -> int:
        priorities = {
            "over_budget": 4,
            "within_budget": 3,
            "unused": 2,
            "inactive": 1,
        }
        return priorities.get(status, 0)

    def _build_monthly_trend(
        self,
        *,
        tenant_db: Session,
        all_transactions: list,
        current_period_month: date,
    ) -> list[dict]:
        months = self._build_trailing_months(current_period_month, count=6)
        rows: list[dict] = []

        for month in months:
            starts_at = self._month_start(month)
            ends_at = self._next_month_start(month)
            month_transactions = [
                transaction
                for transaction in all_transactions
                if starts_at <= self._normalize_datetime(transaction.transaction_at) < ends_at
            ]
            income_total = round(
                sum(
                    item.amount
                    for item in month_transactions
                    if item.transaction_type == "income"
                ),
                2,
            )
            expense_total = round(
                sum(
                    item.amount
                    for item in month_transactions
                    if item.transaction_type == "expense"
                ),
                2,
            )
            _, budget_summary = self.budget_service.list_budgets(
                tenant_db,
                period_month=month,
                include_inactive=True,
            )
            rows.append(
                {
                    "period_month": month,
                    "total_income": income_total,
                    "total_expense": expense_total,
                    "net_balance": round(income_total - expense_total, 2),
                    "total_transactions": len(month_transactions),
                    "total_budgeted": round(float(budget_summary["total_budgeted"]), 2),
                    "total_actual": round(float(budget_summary["total_actual"]), 2),
                    "total_variance": round(float(budget_summary["total_variance"]), 2),
                }
            )
        return rows

    def _month_start(self, period_month: date) -> datetime:
        return datetime.combine(period_month, time.min, tzinfo=timezone.utc)

    def _next_month_start(self, period_month: date) -> datetime:
        provisional = period_month.replace(day=28) + timedelta(days=4)
        next_month = provisional.replace(day=1)
        return datetime.combine(next_month, time.min, tzinfo=timezone.utc)

    def _previous_month_start(self, period_month: date) -> date:
        previous_month_last_day = period_month - timedelta(days=1)
        return previous_month_last_day.replace(day=1)

    def _build_trailing_months(self, current_period_month: date, *, count: int) -> list[date]:
        months: list[date] = []
        cursor = current_period_month
        for _ in range(count):
            months.append(cursor)
            cursor = self._previous_month_start(cursor)
        months.reverse()
        return months

    def _normalize_datetime(self, value: datetime) -> datetime:
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value
