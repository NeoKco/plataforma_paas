from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.common.db.tenant_base import TenantBase


class MaintenanceWorkOrderChecklistItem(TenantBase):
    __tablename__ = "maintenance_work_order_checklist_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    work_order_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("maintenance_work_orders.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    item_key: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    label: Mapped[str] = mapped_column(String(180), nullable=False)
    is_completed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, index=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0, index=True)
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