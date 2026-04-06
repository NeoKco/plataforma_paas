from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.common.db.tenant_base import TenantBase


class MaintenanceVisit(TenantBase):
    __tablename__ = "maintenance_visits"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    work_order_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("maintenance_work_orders.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    visit_type: Mapped[str] = mapped_column(String(40), nullable=False, default="execution", index=True)
    visit_status: Mapped[str] = mapped_column(String(40), nullable=False, default="scheduled", index=True)
    scheduled_start_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True, index=True)
    scheduled_end_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    actual_start_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    actual_end_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    assigned_tenant_user_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    assigned_work_group_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("business_work_groups.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    assigned_group_label: Mapped[str | None] = mapped_column(String(120), nullable=True, index=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
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
