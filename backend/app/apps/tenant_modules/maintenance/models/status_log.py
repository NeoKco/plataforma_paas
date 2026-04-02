from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.common.db.tenant_base import TenantBase


class MaintenanceStatusLog(TenantBase):
    __tablename__ = "maintenance_status_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    work_order_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("maintenance_work_orders.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    from_status: Mapped[str | None] = mapped_column(String(40), nullable=True)
    to_status: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    changed_by_user_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    changed_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
    )
