from sqlalchemy import DateTime, Float, ForeignKey, Integer, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.common.db.tenant_base import TenantBase


class MaintenanceCostActual(TenantBase):
    __tablename__ = "maintenance_cost_actuals"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    work_order_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("maintenance_work_orders.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    labor_cost: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    travel_cost: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    materials_cost: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    external_services_cost: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    overhead_cost: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    total_actual_cost: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    actual_price_charged: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    actual_income: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    actual_profit: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    actual_margin_percent: Mapped[float | None] = mapped_column(Float, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    applied_cost_template_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    applied_cost_template_name_snapshot: Mapped[str | None] = mapped_column(Text, nullable=True)
    income_transaction_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    expense_transaction_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    finance_synced_at: Mapped[DateTime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        index=True,
    )
    created_by_user_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    updated_by_user_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
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
