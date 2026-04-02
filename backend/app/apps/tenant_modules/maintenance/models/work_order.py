from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.common.db.tenant_base import TenantBase


class MaintenanceWorkOrder(TenantBase):
    __tablename__ = "maintenance_work_orders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    client_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("business_clients.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    site_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("business_sites.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    installation_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("maintenance_installations.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    external_reference: Mapped[str | None] = mapped_column(
        String(80),
        nullable=True,
        unique=True,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(180), nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    maintenance_status: Mapped[str] = mapped_column(String(40), nullable=False, default="scheduled", index=True)
    priority: Mapped[str] = mapped_column(String(30), nullable=False, default="normal", index=True)
    requested_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
    )
    scheduled_for: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True, index=True)
    completed_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True, index=True)
    cancelled_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    cancellation_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    closure_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    assigned_tenant_user_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
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
