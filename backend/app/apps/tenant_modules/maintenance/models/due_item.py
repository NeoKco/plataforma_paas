from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.common.db.tenant_base import TenantBase


class MaintenanceDueItem(TenantBase):
    __tablename__ = "maintenance_due_items"
    __table_args__ = (
        UniqueConstraint("schedule_id", "due_at", name="uq_maintenance_due_item_cycle"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    schedule_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("maintenance_schedules.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
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
    due_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    visible_from: Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    due_status: Mapped[str] = mapped_column(String(30), nullable=False, default="upcoming", index=True)
    contact_status: Mapped[str] = mapped_column(String(30), nullable=False, default="not_contacted", index=True)
    assigned_work_group_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("business_work_groups.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    assigned_tenant_user_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    work_order_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("maintenance_work_orders.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    postponed_until: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True, index=True)
    contact_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    resolution_note: Mapped[str | None] = mapped_column(Text, nullable=True)
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
