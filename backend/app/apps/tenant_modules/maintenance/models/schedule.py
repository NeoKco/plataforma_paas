from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.common.db.tenant_base import TenantBase


class MaintenanceSchedule(TenantBase):
    __tablename__ = "maintenance_schedules"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    client_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("business_clients.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    site_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("business_sites.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    installation_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("maintenance_installations.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    task_type_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("business_task_types.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    cost_template_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("maintenance_cost_templates.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(180), nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    frequency_value: Mapped[int] = mapped_column(Integer, nullable=False)
    frequency_unit: Mapped[str] = mapped_column(String(20), nullable=False, default="months", index=True)
    lead_days: Mapped[int] = mapped_column(Integer, nullable=False, default=30)
    start_mode: Mapped[str] = mapped_column(String(40), nullable=False, default="from_manual_due_date")
    base_date: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_executed_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    next_due_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    default_priority: Mapped[str] = mapped_column(String(30), nullable=False, default="normal", index=True)
    estimated_duration_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    billing_mode: Mapped[str] = mapped_column(String(30), nullable=False, default="per_work_order", index=True)
    estimate_target_margin_percent: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    estimate_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, index=True)
    auto_create_due_items: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by_user_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
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
