from sqlalchemy import DateTime, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.common.db.base import Base


class BillingOperationalAlert(Base):
    __tablename__ = "billing_operational_alerts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    alert_code: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    severity: Mapped[str] = mapped_column(String(30), nullable=False, index=True)
    provider: Mapped[str] = mapped_column(String(60), nullable=False, index=True)
    event_type: Mapped[str | None] = mapped_column(String(120), nullable=True, index=True)
    processing_result: Mapped[str | None] = mapped_column(
        String(40),
        nullable=True,
        index=True,
    )
    message: Mapped[str] = mapped_column(Text, nullable=False)
    observed_value: Mapped[int] = mapped_column(Integer, nullable=False)
    threshold_value: Mapped[int | None] = mapped_column(Integer, nullable=True)
    total_tenants: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    source_recorded_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )
    recorded_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
