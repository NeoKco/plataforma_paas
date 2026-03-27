from datetime import date, datetime, time, timedelta, timezone

from sqlalchemy.orm import Session

from app.apps.tenant_modules.finance.repositories import (
    FinanceCategoryRepository,
    FinanceLoanInstallmentRepository,
    FinanceTransactionRepository,
)
from app.apps.tenant_modules.finance.services.budget_service import FinanceBudgetService
from app.apps.tenant_modules.finance.services.loan_service import FinanceLoanService


class FinancePlanningService:
    def __init__(
        self,
        transaction_repository: FinanceTransactionRepository | None = None,
        installment_repository: FinanceLoanInstallmentRepository | None = None,
        category_repository: FinanceCategoryRepository | None = None,
        budget_service: FinanceBudgetService | None = None,
        loan_service: FinanceLoanService | None = None,
    ) -> None:
        self.transaction_repository = (
            transaction_repository or FinanceTransactionRepository()
        )
        self.installment_repository = (
            installment_repository or FinanceLoanInstallmentRepository()
        )
        self.category_repository = category_repository or FinanceCategoryRepository()
        self.budget_service = budget_service or FinanceBudgetService()
        self.loan_service = loan_service or FinanceLoanService()

    def get_monthly_overview(
        self,
        tenant_db: Session,
        *,
        period_month: date,
    ) -> dict:
        normalized_period_month = period_month.replace(day=1)
        starts_at = self._month_start(normalized_period_month)
        ends_at = self._next_month_start(normalized_period_month)

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
        loan_rows, _loan_summary = self.loan_service.list_loans(
            tenant_db,
            include_inactive=True,
        )

        calendar_days = self._build_calendar_days(
            normalized_period_month=normalized_period_month,
            transactions=transactions,
            loan_rows=loan_rows,
            tenant_db=tenant_db,
        )
        loan_due_items = self._build_loan_due_items(
            tenant_db=tenant_db,
            loan_rows=loan_rows,
            starts_at=starts_at,
            ends_at=ends_at,
        )
        budget_focus = self._build_budget_focus(budget_rows)

        total_income = round(
            sum(item.amount for item in transactions if item.transaction_type == "income"),
            2,
        )
        total_expense = round(
            sum(item.amount for item in transactions if item.transaction_type == "expense"),
            2,
        )
        pending_installments_count = len(
            [item for item in loan_due_items if item["installment_status"] != "paid"]
        )
        expected_loan_cashflow = round(
            sum(item["remaining_amount"] for item in loan_due_items),
            2,
        )

        return {
            "period_month": normalized_period_month,
            "summary": {
                "period_month": normalized_period_month,
                "total_income": total_income,
                "total_expense": total_expense,
                "net_total": round(total_income - total_expense, 2),
                "total_transactions": len(transactions),
                "due_installments_count": len(loan_due_items),
                "pending_installments_count": pending_installments_count,
                "expected_loan_cashflow": expected_loan_cashflow,
                "total_budgeted": round(float(budget_summary["total_budgeted"]), 2),
                "total_actual": round(float(budget_summary["total_actual"]), 2),
                "total_variance": round(float(budget_summary["total_variance"]), 2),
            },
            "calendar_days": calendar_days,
            "loan_due_items": loan_due_items,
            "budget_focus": budget_focus,
        }

    def _build_calendar_days(
        self,
        *,
        normalized_period_month: date,
        transactions: list,
        loan_rows: list[dict],
        tenant_db: Session,
    ) -> list[dict]:
        transaction_totals: dict[date, dict[str, float]] = {}
        for transaction in transactions:
            day = self._normalize_datetime(transaction.transaction_at).date()
            bucket = transaction_totals.setdefault(
                day,
                {
                    "income_total": 0.0,
                    "expense_total": 0.0,
                    "transaction_count": 0,
                },
            )
            if transaction.transaction_type == "income":
                bucket["income_total"] += float(transaction.amount)
            elif transaction.transaction_type == "expense":
                bucket["expense_total"] += float(transaction.amount)
            bucket["transaction_count"] += 1

        installments_by_day: dict[date, int] = {}
        for row in loan_rows:
            installments = self.installment_repository.list_by_loan(
                tenant_db, row["loan"].id
            )
            for installment in installments:
                if (
                    installment.due_date.year == normalized_period_month.year
                    and installment.due_date.month == normalized_period_month.month
                ):
                    installments_by_day[installment.due_date] = (
                        installments_by_day.get(installment.due_date, 0) + 1
                    )

        visible_days = sorted(set(transaction_totals) | set(installments_by_day))
        rows: list[dict] = []
        for day in visible_days:
            totals = transaction_totals.get(
                day,
                {"income_total": 0.0, "expense_total": 0.0, "transaction_count": 0},
            )
            rows.append(
                {
                    "day": day,
                    "income_total": round(float(totals["income_total"]), 2),
                    "expense_total": round(float(totals["expense_total"]), 2),
                    "net_total": round(
                        float(totals["income_total"]) - float(totals["expense_total"]),
                        2,
                    ),
                    "transaction_count": int(totals["transaction_count"]),
                    "due_installments_count": installments_by_day.get(day, 0),
                }
            )
        return rows

    def _build_loan_due_items(
        self,
        *,
        tenant_db: Session,
        loan_rows: list[dict],
        starts_at: datetime,
        ends_at: datetime,
    ) -> list[dict]:
        rows: list[dict] = []
        for row in loan_rows:
            loan = row["loan"]
            installments = self.installment_repository.list_by_loan(tenant_db, loan.id)
            for installment in installments:
                due_date_dt = datetime.combine(installment.due_date, time.min, tzinfo=timezone.utc)
                if not (starts_at <= due_date_dt < ends_at):
                    continue
                remaining_amount = round(
                    max(float(installment.planned_amount) - float(installment.paid_amount), 0.0),
                    2,
                )
                rows.append(
                    {
                        "loan_id": loan.id,
                        "loan_name": loan.name,
                        "loan_type": loan.loan_type,
                        "installment_id": installment.id,
                        "installment_number": installment.installment_number,
                        "due_date": installment.due_date,
                        "planned_amount": float(installment.planned_amount),
                        "paid_amount": float(installment.paid_amount),
                        "remaining_amount": remaining_amount,
                        "installment_status": self._build_installment_status(
                            due_date=installment.due_date,
                            planned_amount=float(installment.planned_amount),
                            paid_amount=float(installment.paid_amount),
                        ),
                    }
                )
        rows.sort(key=lambda item: (item["due_date"], item["loan_name"], item["installment_number"]))
        return rows

    def _build_budget_focus(self, budget_rows: list[dict]) -> list[dict]:
        rows = [
            {
                "category_id": row["budget"].category_id,
                "category_name": row["category_name"],
                "category_type": row["category_type"],
                "planned_amount": float(row["budget"].amount),
                "actual_amount": float(row["actual_amount"]),
                "variance_amount": float(row["variance_amount"]),
                "budget_status": row["budget_status"],
            }
            for row in budget_rows
        ]
        rows.sort(
            key=lambda item: (
                -abs(item["variance_amount"]),
                item["category_name"],
            )
        )
        return rows[:5]

    def _build_installment_status(
        self,
        *,
        due_date: date,
        planned_amount: float,
        paid_amount: float,
    ) -> str:
        if paid_amount >= planned_amount:
            return "paid"
        if paid_amount > 0:
            return "partial"
        if due_date < date.today():
            return "overdue"
        return "pending"

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
