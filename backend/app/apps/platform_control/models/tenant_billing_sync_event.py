from sqlalchemy import DateTime, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.common.db.base import Base


class TenantBillingSyncEvent(Base):
    __tablename__ = "tenant_billing_sync_events"
    __table_args__ = (
        UniqueConstraint(
            "provider",
            "provider_event_id",
            name="uq_tenant_billing_sync_provider_event",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    tenant_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    tenant_slug: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    provider: Mapped[str] = mapped_column(String(60), nullable=False, index=True)
    provider_event_id: Mapped[str] = mapped_column(String(150), nullable=False)
    provider_customer_id: Mapped[str | None] = mapped_column(
        String(150),
        nullable=True,
    )
    provider_subscription_id: Mapped[str | None] = mapped_column(
        String(150),
        nullable=True,
    )
    event_type: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    billing_status: Mapped[str | None] = mapped_column(String(50), nullable=True)
    billing_status_reason: Mapped[str | None] = mapped_column(String(255), nullable=True)
    billing_current_period_ends_at: Mapped[DateTime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    billing_grace_until: Mapped[DateTime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    raw_payload_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    processing_result: Mapped[str] = mapped_column(String(30), nullable=False)
    recorded_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
