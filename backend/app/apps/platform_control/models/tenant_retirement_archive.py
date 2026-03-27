from sqlalchemy import DateTime, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.common.db.base import Base


class TenantRetirementArchive(Base):
    __tablename__ = "tenant_retirement_archives"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    original_tenant_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    tenant_slug: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    tenant_name: Mapped[str] = mapped_column(String(150), nullable=False)
    tenant_type: Mapped[str] = mapped_column(String(50), nullable=False)
    plan_code: Mapped[str | None] = mapped_column(String(50), nullable=True)
    tenant_status: Mapped[str] = mapped_column(String(50), nullable=False)
    tenant_status_reason: Mapped[str | None] = mapped_column(String(255), nullable=True)
    billing_provider: Mapped[str | None] = mapped_column(String(50), nullable=True)
    billing_provider_customer_id: Mapped[str | None] = mapped_column(
        String(150),
        nullable=True,
    )
    billing_provider_subscription_id: Mapped[str | None] = mapped_column(
        String(150),
        nullable=True,
    )
    billing_status: Mapped[str | None] = mapped_column(String(50), nullable=True)
    billing_status_reason: Mapped[str | None] = mapped_column(String(255), nullable=True)
    billing_events_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    policy_events_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    provisioning_jobs_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )
    deleted_by_user_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    deleted_by_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    tenant_created_at: Mapped[DateTime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    summary_json: Mapped[str] = mapped_column(Text, nullable=False)
    deleted_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
