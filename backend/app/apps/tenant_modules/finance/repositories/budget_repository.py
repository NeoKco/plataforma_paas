from datetime import date, datetime

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.apps.tenant_modules.finance.models import FinanceBudget, FinanceTransaction


class FinanceBudgetRepository:
    def save(self, tenant_db: Session, budget: FinanceBudget) -> FinanceBudget:
        tenant_db.add(budget)
        tenant_db.commit()
        tenant_db.refresh(budget)
        return budget

    def list_by_period_month(
        self,
        tenant_db: Session,
        period_month: date,
        *,
        include_inactive: bool = True,
    ) -> list[FinanceBudget]:
        query = tenant_db.query(FinanceBudget).filter(FinanceBudget.period_month == period_month)
        if not include_inactive:
            query = query.filter(FinanceBudget.is_active.is_(True))
        return query.order_by(FinanceBudget.category_id.asc(), FinanceBudget.id.asc()).all()

    def get_by_id(self, tenant_db: Session, budget_id: int) -> FinanceBudget | None:
        return tenant_db.query(FinanceBudget).filter(FinanceBudget.id == budget_id).first()

    def get_by_period_month_and_category(
        self,
        tenant_db: Session,
        period_month: date,
        category_id: int,
    ) -> FinanceBudget | None:
        return (
            tenant_db.query(FinanceBudget)
            .filter(
                FinanceBudget.period_month == period_month,
                FinanceBudget.category_id == category_id,
            )
            .first()
        )

    def aggregate_actual_amounts_by_category(
        self,
        tenant_db: Session,
        *,
        starts_at: datetime,
        ends_at: datetime,
    ) -> dict[int, float]:
        rows = (
            tenant_db.query(
                FinanceTransaction.category_id,
                func.sum(
                    func.coalesce(
                        FinanceTransaction.amount_in_base_currency,
                        FinanceTransaction.amount,
                    )
                ),
            )
            .filter(FinanceTransaction.category_id.is_not(None))
            .filter(FinanceTransaction.transaction_at >= starts_at)
            .filter(FinanceTransaction.transaction_at < ends_at)
            .group_by(FinanceTransaction.category_id)
            .all()
        )
        return {
            category_id: float(total or 0)
            for category_id, total in rows
            if category_id is not None
        }
