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
        compare_period_month: date | None = None,
        custom_compare_start_month: date | None = None,
        custom_compare_end_month: date | None = None,
        trend_months: int = 6,
        movement_scope: str = "all",
        analysis_scope: str = "period",
        budget_category_scope: str = "all",
        budget_status_filter: str = "all",
    ) -> dict:
        if trend_months not in {3, 6, 12}:
            raise ValueError("trend_months must be one of 3, 6 or 12")
        if movement_scope not in {
            "all",
            "reconciled",
            "unreconciled",
            "favorites",
            "loan_linked",
        }:
            raise ValueError(
                "movement_scope must be one of all, reconciled, unreconciled, favorites or loan_linked"
            )
        if analysis_scope not in {"period", "horizon", "year_to_date"}:
            raise ValueError(
                "analysis_scope must be one of period, horizon or year_to_date"
            )
        if (custom_compare_start_month is None) != (custom_compare_end_month is None):
            raise ValueError(
                "custom_compare_start_month and custom_compare_end_month must be provided together"
            )
        if budget_category_scope not in {"all", "income", "expense"}:
            raise ValueError("budget_category_scope must be one of all, income or expense")
        if budget_status_filter not in {
            "all",
            "over_budget",
            "within_budget",
            "unused",
            "inactive",
        }:
            raise ValueError(
                "budget_status_filter must be one of all, over_budget, within_budget, unused or inactive"
            )
        normalized_period_month = period_month.replace(day=1)
        starts_at = self._month_start(normalized_period_month)
        ends_at = self._next_month_start(normalized_period_month)
        comparison_period_month = (
            compare_period_month.replace(day=1)
            if compare_period_month is not None
            else self._previous_month_start(normalized_period_month)
        )
        normalized_custom_compare_start_month = (
            custom_compare_start_month.replace(day=1)
            if custom_compare_start_month is not None
            else None
        )
        normalized_custom_compare_end_month = (
            custom_compare_end_month.replace(day=1)
            if custom_compare_end_month is not None
            else None
        )
        if (
            normalized_custom_compare_start_month is not None
            and normalized_custom_compare_end_month is not None
            and normalized_custom_compare_start_month > normalized_custom_compare_end_month
        ):
            raise ValueError("custom comparison range must be ordered from oldest to newest")
        comparison_starts_at = self._month_start(comparison_period_month)
        comparison_ends_at = self._next_month_start(comparison_period_month)

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
        transactions = self._filter_transactions_by_scope(
            transactions,
            movement_scope=movement_scope,
        )
        previous_transactions = [
            transaction
            for transaction in all_transactions
            if comparison_starts_at
            <= self._normalize_datetime(transaction.transaction_at)
            < comparison_ends_at
        ]
        previous_transactions = self._filter_transactions_by_scope(
            previous_transactions,
            movement_scope=movement_scope,
        )
        budget_rows, budget_summary = self.budget_service.list_budgets(
            tenant_db,
            period_month=normalized_period_month,
            include_inactive=True,
            category_type=None if budget_category_scope == "all" else budget_category_scope,
            budget_status=None if budget_status_filter == "all" else budget_status_filter,
        )
        _, previous_budget_summary = self.budget_service.list_budgets(
            tenant_db,
            period_month=comparison_period_month,
            include_inactive=True,
            category_type=None if budget_category_scope == "all" else budget_category_scope,
            budget_status=None if budget_status_filter == "all" else budget_status_filter,
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

        monthly_trend = self._build_monthly_trend(
            tenant_db=tenant_db,
            all_transactions=all_transactions,
            current_period_month=normalized_period_month,
            trend_months=trend_months,
            movement_scope=movement_scope,
            budget_category_scope=budget_category_scope,
            budget_status_filter=budget_status_filter,
        )
        comparison_monthly_trend = self._build_monthly_trend(
            tenant_db=tenant_db,
            all_transactions=all_transactions,
            current_period_month=comparison_period_month,
            trend_months=trend_months,
            movement_scope=movement_scope,
            budget_category_scope=budget_category_scope,
            budget_status_filter=budget_status_filter,
        )
        current_ytd_trend = self._build_monthly_trend(
            tenant_db=tenant_db,
            all_transactions=all_transactions,
            current_period_month=normalized_period_month,
            trend_months=normalized_period_month.month,
            movement_scope=movement_scope,
            budget_category_scope=budget_category_scope,
            budget_status_filter=budget_status_filter,
        )
        compare_ytd_trend = self._build_monthly_trend(
            tenant_db=tenant_db,
            all_transactions=all_transactions,
            current_period_month=comparison_period_month,
            trend_months=comparison_period_month.month,
            movement_scope=movement_scope,
            budget_category_scope=budget_category_scope,
            budget_status_filter=budget_status_filter,
        )
        trend_summary = self._build_trend_summary(monthly_trend)
        current_analysis_summary = self._build_current_analysis_summary(
            analysis_scope=analysis_scope,
            period_month=normalized_period_month,
            period_summary=transaction_snapshot,
            trend_months=trend_months,
            trend_summary=trend_summary,
            year_to_date_trend=current_ytd_trend,
        )
        analysis_transactions = self._build_analysis_transactions(
            all_transactions=all_transactions,
            current_period_month=normalized_period_month,
            trend_months=trend_months,
            movement_scope=movement_scope,
            analysis_scope=analysis_scope,
        )

        return {
            "period_month": normalized_period_month,
            "movement_scope": movement_scope,
            "analysis_scope": analysis_scope,
            "budget_category_scope": budget_category_scope,
            "budget_status_filter": budget_status_filter,
            "transaction_snapshot": transaction_snapshot,
            "budget_snapshot": budget_snapshot,
            "loan_snapshot": loan_snapshot,
            "top_income_categories": self._build_top_categories(
                transactions=[
                    transaction
                    for transaction in analysis_transactions
                    if transaction.transaction_type == "income"
                ],
                categories=categories,
                category_type="income",
            ),
            "top_expense_categories": self._build_top_categories(
                transactions=[
                    transaction
                    for transaction in analysis_transactions
                    if transaction.transaction_type == "expense"
                ],
                categories=categories,
                category_type="expense",
            ),
            "daily_cashflow": self._build_daily_cashflow(transactions=transactions),
            "budget_variances": self._build_budget_variances(budget_rows=budget_rows),
            "period_comparison": {
                "current_period_month": normalized_period_month,
                "compare_period_month": comparison_period_month,
                "previous_period_month": comparison_period_month,
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
            "monthly_trend": monthly_trend,
            "trend_summary": trend_summary,
            "horizon_comparison": self._build_horizon_comparison(
                current_trend=monthly_trend,
                current_summary=trend_summary,
                comparison_trend=comparison_monthly_trend,
            ),
            "year_to_date_comparison": self._build_year_to_date_comparison(
                current_trend=current_ytd_trend,
                comparison_trend=compare_ytd_trend,
            ),
            "custom_range_comparison": self._build_custom_range_comparison(
                tenant_db=tenant_db,
                all_transactions=all_transactions,
                custom_compare_start_month=normalized_custom_compare_start_month,
                custom_compare_end_month=normalized_custom_compare_end_month,
                movement_scope=movement_scope,
                budget_category_scope=budget_category_scope,
                budget_status_filter=budget_status_filter,
                current_analysis_summary=current_analysis_summary,
            ),
        }

    def _build_analysis_transactions(
        self,
        *,
        all_transactions: list,
        current_period_month: date,
        trend_months: int,
        movement_scope: str,
        analysis_scope: str,
    ) -> list:
        if analysis_scope == "period":
            starts_at = self._month_start(current_period_month)
        elif analysis_scope == "horizon":
            first_period_month = self._build_trailing_months(
                current_period_month, count=trend_months
            )[0]
            starts_at = self._month_start(first_period_month)
        else:
            starts_at = self._month_start(current_period_month.replace(month=1, day=1))

        ends_at = self._next_month_start(current_period_month)
        transactions = [
            transaction
            for transaction in all_transactions
            if starts_at <= self._normalize_datetime(transaction.transaction_at) < ends_at
        ]
        return self._filter_transactions_by_scope(
            transactions,
            movement_scope=movement_scope,
        )

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

    def _build_current_analysis_summary(
        self,
        *,
        analysis_scope: str,
        period_month: date,
        period_summary: dict,
        trend_months: int,
        trend_summary: dict,
        year_to_date_trend: list[dict],
    ) -> dict:
        if analysis_scope == "period":
            return {
                "label": "periodo",
                "first_period_month": period_month,
                "last_period_month": period_month,
                "months_covered": 1,
                "total_income": period_summary["total_income"],
                "total_expense": period_summary["total_expense"],
                "total_net_balance": period_summary["net_balance"],
            }
        if analysis_scope == "horizon":
            return {
                "label": f"horizonte_{trend_months}m",
                "first_period_month": trend_summary["first_period_month"],
                "last_period_month": trend_summary["last_period_month"],
                "months_covered": trend_summary["months_covered"],
                "total_income": trend_summary["total_income"],
                "total_expense": trend_summary["total_expense"],
                "total_net_balance": trend_summary["total_net_balance"],
            }
        ytd_summary = self._build_trend_summary(year_to_date_trend)
        return {
            "label": "year_to_date",
            "first_period_month": ytd_summary["first_period_month"],
            "last_period_month": ytd_summary["last_period_month"],
            "months_covered": ytd_summary["months_covered"],
            "total_income": ytd_summary["total_income"],
            "total_expense": ytd_summary["total_expense"],
            "total_net_balance": ytd_summary["total_net_balance"],
        }

    def _build_custom_range_comparison(
        self,
        *,
        tenant_db: Session,
        all_transactions: list,
        custom_compare_start_month: date | None,
        custom_compare_end_month: date | None,
        movement_scope: str,
        budget_category_scope: str,
        budget_status_filter: str,
        current_analysis_summary: dict,
    ) -> dict | None:
        if custom_compare_start_month is None or custom_compare_end_month is None:
            return None

        custom_months = self._month_distance_inclusive(
            custom_compare_start_month,
            custom_compare_end_month,
        )
        custom_trend = self._build_monthly_trend(
            tenant_db=tenant_db,
            all_transactions=all_transactions,
            current_period_month=custom_compare_end_month,
            trend_months=custom_months,
            movement_scope=movement_scope,
            budget_category_scope=budget_category_scope,
            budget_status_filter=budget_status_filter,
        )
        custom_summary = self._build_trend_summary(custom_trend)

        return {
            "current_label": current_analysis_summary["label"],
            "current_first_period_month": current_analysis_summary["first_period_month"],
            "current_last_period_month": current_analysis_summary["last_period_month"],
            "current_months_covered": current_analysis_summary["months_covered"],
            "current_total_income": current_analysis_summary["total_income"],
            "current_total_expense": current_analysis_summary["total_expense"],
            "current_total_net_balance": current_analysis_summary["total_net_balance"],
            "custom_first_period_month": custom_summary["first_period_month"],
            "custom_last_period_month": custom_summary["last_period_month"],
            "custom_months_covered": custom_summary["months_covered"],
            "custom_total_income": custom_summary["total_income"],
            "custom_total_expense": custom_summary["total_expense"],
            "custom_total_net_balance": custom_summary["total_net_balance"],
            "total_income_delta_vs_custom": round(
                float(current_analysis_summary["total_income"])
                - float(custom_summary["total_income"]),
                2,
            ),
            "total_expense_delta_vs_custom": round(
                float(current_analysis_summary["total_expense"])
                - float(custom_summary["total_expense"]),
                2,
            ),
            "total_net_balance_delta_vs_custom": round(
                float(current_analysis_summary["total_net_balance"])
                - float(custom_summary["total_net_balance"]),
                2,
            ),
        }

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
        trend_months: int,
        movement_scope: str,
        budget_category_scope: str,
        budget_status_filter: str,
    ) -> list[dict]:
        months = self._build_trailing_months(current_period_month, count=trend_months)
        rows: list[dict] = []

        for month in months:
            starts_at = self._month_start(month)
            ends_at = self._next_month_start(month)
            month_transactions = [
                transaction
                for transaction in all_transactions
                if starts_at <= self._normalize_datetime(transaction.transaction_at) < ends_at
            ]
            month_transactions = self._filter_transactions_by_scope(
                month_transactions,
                movement_scope=movement_scope,
            )
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
                category_type=None if budget_category_scope == "all" else budget_category_scope,
                budget_status=None if budget_status_filter == "all" else budget_status_filter,
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

    def _build_trend_summary(self, monthly_trend: list[dict]) -> dict:
        if not monthly_trend:
            return {
                "months_covered": 0,
                "first_period_month": None,
                "last_period_month": None,
                "total_income": 0.0,
                "total_expense": 0.0,
                "total_net_balance": 0.0,
                "average_income": 0.0,
                "average_expense": 0.0,
                "average_net_balance": 0.0,
                "best_period_month": None,
                "best_net_balance": None,
                "worst_period_month": None,
                "worst_net_balance": None,
                "net_balance_delta_vs_first": 0.0,
            }

        months_covered = len(monthly_trend)
        total_income = round(sum(item["total_income"] for item in monthly_trend), 2)
        total_expense = round(sum(item["total_expense"] for item in monthly_trend), 2)
        total_net_balance = round(
            sum(item["net_balance"] for item in monthly_trend),
            2,
        )
        best_month = max(monthly_trend, key=lambda item: item["net_balance"])
        worst_month = min(monthly_trend, key=lambda item: item["net_balance"])
        first_month = monthly_trend[0]
        last_month = monthly_trend[-1]

        return {
            "months_covered": months_covered,
            "first_period_month": first_month["period_month"],
            "last_period_month": last_month["period_month"],
            "total_income": total_income,
            "total_expense": total_expense,
            "total_net_balance": total_net_balance,
            "average_income": round(total_income / months_covered, 2),
            "average_expense": round(total_expense / months_covered, 2),
            "average_net_balance": round(total_net_balance / months_covered, 2),
            "best_period_month": best_month["period_month"],
            "best_net_balance": round(float(best_month["net_balance"]), 2),
            "worst_period_month": worst_month["period_month"],
            "worst_net_balance": round(float(worst_month["net_balance"]), 2),
            "net_balance_delta_vs_first": round(
                float(last_month["net_balance"]) - float(first_month["net_balance"]),
                2,
            ),
        }

    def _build_horizon_comparison(
        self,
        *,
        current_trend: list[dict],
        current_summary: dict,
        comparison_trend: list[dict],
    ) -> dict:
        comparison_summary = self._build_trend_summary(comparison_trend)

        return {
            "trend_months": len(current_trend),
            "current_first_period_month": current_summary["first_period_month"],
            "current_last_period_month": current_summary["last_period_month"],
            "compare_first_period_month": comparison_summary["first_period_month"],
            "compare_last_period_month": comparison_summary["last_period_month"],
            "compare_months_covered": comparison_summary["months_covered"],
            "compare_total_income": comparison_summary["total_income"],
            "compare_total_expense": comparison_summary["total_expense"],
            "compare_total_net_balance": comparison_summary["total_net_balance"],
            "compare_average_income": comparison_summary["average_income"],
            "compare_average_expense": comparison_summary["average_expense"],
            "compare_average_net_balance": comparison_summary["average_net_balance"],
            "total_income_delta_vs_compare": round(
                float(current_summary["total_income"])
                - float(comparison_summary["total_income"]),
                2,
            ),
            "total_expense_delta_vs_compare": round(
                float(current_summary["total_expense"])
                - float(comparison_summary["total_expense"]),
                2,
            ),
            "total_net_balance_delta_vs_compare": round(
                float(current_summary["total_net_balance"])
                - float(comparison_summary["total_net_balance"]),
                2,
            ),
            "average_net_balance_delta_vs_compare": round(
                float(current_summary["average_net_balance"])
                - float(comparison_summary["average_net_balance"]),
                2,
            ),
        }

    def _build_year_to_date_comparison(
        self,
        *,
        current_trend: list[dict],
        comparison_trend: list[dict],
    ) -> dict:
        current_summary = self._build_trend_summary(current_trend)
        comparison_summary = self._build_trend_summary(comparison_trend)

        return {
            "current_first_period_month": current_summary["first_period_month"],
            "current_last_period_month": current_summary["last_period_month"],
            "current_months_covered": current_summary["months_covered"],
            "current_total_income": current_summary["total_income"],
            "current_total_expense": current_summary["total_expense"],
            "current_total_net_balance": current_summary["total_net_balance"],
            "compare_first_period_month": comparison_summary["first_period_month"],
            "compare_last_period_month": comparison_summary["last_period_month"],
            "compare_months_covered": comparison_summary["months_covered"],
            "compare_total_income": comparison_summary["total_income"],
            "compare_total_expense": comparison_summary["total_expense"],
            "compare_total_net_balance": comparison_summary["total_net_balance"],
            "total_income_delta_vs_compare": round(
                float(current_summary["total_income"])
                - float(comparison_summary["total_income"]),
                2,
            ),
            "total_expense_delta_vs_compare": round(
                float(current_summary["total_expense"])
                - float(comparison_summary["total_expense"]),
                2,
            ),
            "total_net_balance_delta_vs_compare": round(
                float(current_summary["total_net_balance"])
                - float(comparison_summary["total_net_balance"]),
                2,
            ),
        }

    def _filter_transactions_by_scope(
        self,
        transactions: list,
        *,
        movement_scope: str,
    ) -> list:
        if movement_scope == "all":
            return transactions
        if movement_scope == "reconciled":
            return [item for item in transactions if item.is_reconciled]
        if movement_scope == "unreconciled":
            return [item for item in transactions if not item.is_reconciled]
        if movement_scope == "favorites":
            return [item for item in transactions if item.is_favorite]
        if movement_scope == "loan_linked":
            return [item for item in transactions if item.loan_id is not None]
        return transactions

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

    def _month_distance_inclusive(self, starts_at: date, ends_at: date) -> int:
        return ((ends_at.year - starts_at.year) * 12) + (ends_at.month - starts_at.month) + 1

    def _normalize_datetime(self, value: datetime) -> datetime:
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value
