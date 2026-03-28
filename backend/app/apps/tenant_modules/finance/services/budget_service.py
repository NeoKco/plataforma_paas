from datetime import date, datetime, time, timedelta, timezone

from sqlalchemy.orm import Session

from app.apps.tenant_modules.finance.models import FinanceBudget
from app.apps.tenant_modules.finance.repositories import (
    FinanceBudgetRepository,
    FinanceCategoryRepository,
)
from app.apps.tenant_modules.finance.schemas import (
    FinanceBudgetCreateRequest,
    FinanceBudgetUpdateRequest,
)


class FinanceBudgetService:
    def __init__(
        self,
        budget_repository: FinanceBudgetRepository | None = None,
        category_repository: FinanceCategoryRepository | None = None,
    ) -> None:
        self.budget_repository = budget_repository or FinanceBudgetRepository()
        self.category_repository = category_repository or FinanceCategoryRepository()

    def list_budgets(
        self,
        tenant_db: Session,
        *,
        period_month: date,
        include_inactive: bool = True,
        category_type: str | None = None,
        budget_status: str | None = None,
    ) -> tuple[list[dict], dict, list[dict]]:
        normalized_period_month = self._normalize_period_month(period_month)
        budgets = self.budget_repository.list_by_period_month(
            tenant_db,
            normalized_period_month,
            include_inactive=include_inactive,
            category_type=category_type,
        )
        actual_amounts = self.budget_repository.aggregate_actual_amounts_by_category(
            tenant_db,
            starts_at=self._month_start(normalized_period_month),
            ends_at=self._next_month_start(normalized_period_month),
        )
        rows: list[dict] = []
        for budget in budgets:
            category = self._get_category_or_raise(tenant_db, budget.category_id)
            actual_amount = actual_amounts.get(budget.category_id, 0.0)
            variance_amount = budget.amount - actual_amount
            utilization_ratio = (
                None if budget.amount <= 0 else actual_amount / budget.amount
            )
            derived_budget_status = self._build_budget_status(
                is_active=budget.is_active,
                actual_amount=actual_amount,
                planned_amount=budget.amount,
            )
            rows.append(
                {
                    "budget": budget,
                    "category_name": category.name,
                    "category_type": category.category_type,
                    "budget_status": derived_budget_status,
                    "recommended_action": self._build_recommended_action(
                        derived_budget_status
                    ),
                    "actual_amount": actual_amount,
                    "variance_amount": variance_amount,
                    "utilization_ratio": utilization_ratio,
                }
            )

        if budget_status:
            rows = [
                row for row in rows if row["budget_status"] == budget_status
            ]

        summary = {
            "period_month": normalized_period_month,
            "total_budgeted": sum(item["budget"].amount for item in rows),
            "total_actual": sum(item["actual_amount"] for item in rows),
            "total_variance": sum(item["variance_amount"] for item in rows),
            "total_items": len(rows),
            "income_budgeted": sum(
                item["budget"].amount
                for item in rows
                if item["category_type"] == "income"
            ),
            "income_actual": sum(
                item["actual_amount"]
                for item in rows
                if item["category_type"] == "income"
            ),
            "expense_budgeted": sum(
                item["budget"].amount
                for item in rows
                if item["category_type"] == "expense"
            ),
            "expense_actual": sum(
                item["actual_amount"]
                for item in rows
                if item["category_type"] == "expense"
            ),
            "over_budget_items": len(
                [item for item in rows if item["budget_status"] == "over_budget"]
            ),
            "within_budget_items": len(
                [item for item in rows if item["budget_status"] == "within_budget"]
            ),
            "unused_items": len(
                [item for item in rows if item["budget_status"] == "unused"]
            ),
            "inactive_items": len(
                [item for item in rows if item["budget_status"] == "inactive"]
            ),
        }
        focus_items = sorted(
            rows,
            key=lambda item: (
                self._budget_attention_priority(item["budget_status"]),
                -abs(item["variance_amount"]),
                item["category_name"].lower(),
            ),
        )[:5]
        return rows, summary, focus_items

    def create_budget(
        self,
        tenant_db: Session,
        payload: FinanceBudgetCreateRequest,
    ) -> FinanceBudget:
        normalized = self._normalize_payload(payload)
        self._validate_payload(tenant_db, normalized)
        budget = FinanceBudget(**normalized)
        return self.budget_repository.save(tenant_db, budget)

    def update_budget(
        self,
        tenant_db: Session,
        budget_id: int,
        payload: FinanceBudgetUpdateRequest,
    ) -> FinanceBudget:
        budget = self._get_budget_or_raise(tenant_db, budget_id)
        normalized = self._normalize_payload(payload)
        self._validate_payload(tenant_db, normalized, current_budget=budget)
        for field, value in normalized.items():
            setattr(budget, field, value)
        return self.budget_repository.save(tenant_db, budget)

    def _get_budget_or_raise(self, tenant_db: Session, budget_id: int) -> FinanceBudget:
        budget = self.budget_repository.get_by_id(tenant_db, budget_id)
        if budget is None:
            raise ValueError("El presupuesto financiero solicitado no existe")
        return budget

    def _get_category_or_raise(self, tenant_db: Session, category_id: int):
        category = self.category_repository.get_by_id(tenant_db, category_id)
        if category is None:
            raise ValueError("La categoria financiera solicitada no existe")
        return category

    def _normalize_payload(
        self,
        payload: FinanceBudgetCreateRequest | FinanceBudgetUpdateRequest,
    ) -> dict:
        return {
            "period_month": self._normalize_period_month(payload.period_month),
            "category_id": payload.category_id,
            "amount": payload.amount,
            "note": payload.note.strip() if payload.note and payload.note.strip() else None,
            "is_active": payload.is_active,
        }

    def _validate_payload(
        self,
        tenant_db: Session,
        payload: dict,
        *,
        current_budget: FinanceBudget | None = None,
    ) -> None:
        if payload["amount"] <= 0:
            raise ValueError("El monto del presupuesto debe ser mayor que cero")

        category = self._get_category_or_raise(tenant_db, payload["category_id"])
        if category.category_type not in {"income", "expense"}:
            raise ValueError("Solo se permiten categorias de ingreso o egreso en presupuestos")

        existing = self.budget_repository.get_by_period_month_and_category(
            tenant_db,
            payload["period_month"],
            payload["category_id"],
        )
        if existing and (current_budget is None or existing.id != current_budget.id):
            raise ValueError("Ya existe un presupuesto para esa categoria en el periodo indicado")

    def _normalize_period_month(self, period_month: date) -> date:
        return period_month.replace(day=1)

    def _build_budget_status(
        self,
        *,
        is_active: bool,
        actual_amount: float,
        planned_amount: float,
    ) -> str:
        if not is_active:
            return "inactive"
        if actual_amount <= 0:
            return "unused"
        if actual_amount > planned_amount:
            return "over_budget"
        return "within_budget"

    def _budget_attention_priority(self, value: str) -> int:
        if value == "over_budget":
            return 0
        if value == "unused":
            return 1
        if value == "inactive":
            return 2
        return 3

    def _build_recommended_action(self, budget_status: str) -> str:
        if budget_status == "over_budget":
            return "adjust_amount"
        if budget_status == "unused":
            return "review_usage"
        if budget_status == "inactive":
            return "activate_budget"
        return "keep_tracking"

    def _month_start(self, period_month: date) -> datetime:
        return datetime.combine(period_month, time.min, tzinfo=timezone.utc)

    def _next_month_start(self, period_month: date) -> datetime:
        provisional = period_month.replace(day=28) + timedelta(days=4)
        next_month = provisional.replace(day=1)
        return datetime.combine(next_month, time.min, tzinfo=timezone.utc)
