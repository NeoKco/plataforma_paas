from sqlalchemy import Boolean, DateTime, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.common.db.base import Base


class Tenant(Base):
    __tablename__ = "tenants"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    tenant_type: Mapped[str] = mapped_column(String(50), nullable=False)
    plan_code: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )
    billing_provider: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
        index=True,
    )
    billing_provider_customer_id: Mapped[str | None] = mapped_column(
        String(150),
        nullable=True,
        index=True,
    )
    billing_provider_subscription_id: Mapped[str | None] = mapped_column(
        String(150),
        nullable=True,
        index=True,
    )
    billing_status: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )
    billing_status_reason: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )
    billing_current_period_ends_at: Mapped[DateTime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    billing_grace_until: Mapped[DateTime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    status: Mapped[str] = mapped_column(String(50), default="pending", nullable=False)
    status_reason: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )
    maintenance_mode: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )
    maintenance_starts_at: Mapped[DateTime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    maintenance_ends_at: Mapped[DateTime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    maintenance_reason: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )
    maintenance_scopes: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )
    maintenance_access_mode: Mapped[str] = mapped_column(
        String(50),
        default="write_block",
        nullable=False,
    )
    api_read_requests_per_minute: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )
    api_write_requests_per_minute: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )
    module_limits_json: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    db_name: Mapped[str | None] = mapped_column(String(150), nullable=True)
    db_user: Mapped[str | None] = mapped_column(String(150), nullable=True)
    db_host: Mapped[str | None] = mapped_column(String(100), nullable=True)
    db_port: Mapped[int | None] = mapped_column(Integer, nullable=True)
    bootstrap_admin_full_name: Mapped[str | None] = mapped_column(
        String(150),
        nullable=True,
    )
    bootstrap_admin_email: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )
    bootstrap_admin_password_hash: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )
    tenant_schema_version: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )
    tenant_schema_synced_at: Mapped[DateTime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    tenant_db_credentials_rotated_at: Mapped[DateTime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    created_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    data_transfer_jobs = relationship(
        "TenantDataTransferJob",
        back_populates="tenant",
    )
    provisioning_jobs = relationship(
        "ProvisioningJob",
        back_populates="tenant",
    )
    subscription = relationship(
        "TenantSubscription",
        back_populates="tenant",
        uselist=False,
        cascade="all, delete-orphan",
        single_parent=True,
    )
