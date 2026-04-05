from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.common.db.tenant_base import TenantBase


class MaintenanceScheduleCostLine(TenantBase):
    __tablename__ = "maintenance_schedule_cost_lines"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    schedule_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("maintenance_schedules.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    line_type: Mapped[str] = mapped_column(String(30), nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(String(180), nullable=True)
    quantity: Mapped[float] = mapped_column(Float, nullable=False, default=1)
    unit_cost: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    total_cost: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0, index=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
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