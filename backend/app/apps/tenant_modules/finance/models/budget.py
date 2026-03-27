from sqlalchemy import Boolean, CheckConstraint, Date, DateTime, Float, ForeignKey, Integer, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.common.db.tenant_base import TenantBase


class FinanceBudget(TenantBase):
    __tablename__ = "finance_budgets"
    __table_args__ = (
        UniqueConstraint("period_month", "category_id", name="uq_finance_budgets_period_category"),
        CheckConstraint("amount > 0", name="chk_finance_budgets_amount_positive"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    period_month: Mapped[Date] = mapped_column(Date, nullable=False, index=True)
    category_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("finance_categories.id"),
        nullable=False,
        index=True,
    )
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, index=True)
    created_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
    )
    updated_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
