from sqlalchemy import DateTime, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.common.db.base import Base


class ProvisioningOperationalAlert(Base):
    __tablename__ = "provisioning_operational_alerts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    alert_code: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    severity: Mapped[str] = mapped_column(String(30), nullable=False, index=True)
    source_type: Mapped[str] = mapped_column(String(60), nullable=False, index=True)
    error_code: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    tenant_slug: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    worker_profile: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
        index=True,
    )
    capture_key: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    observed_value_json: Mapped[str] = mapped_column(Text, nullable=False)
    threshold_value_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    source_captured_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )
    recorded_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
