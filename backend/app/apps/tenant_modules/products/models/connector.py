from sqlalchemy import Boolean, DateTime, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.common.db.tenant_base import TenantBase


class ProductConnector(TenantBase):
    __tablename__ = "products_connectors"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(160), nullable=False, index=True)
    connector_kind: Mapped[str] = mapped_column(String(40), nullable=False, default="generic_url", index=True)
    base_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    default_currency_code: Mapped[str] = mapped_column(String(12), nullable=False, default="CLP")
    supports_batch: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    supports_price_tracking: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, index=True)
    provider_key: Mapped[str] = mapped_column(String(40), nullable=False, default="generic", index=True)
    provider_profile: Mapped[str] = mapped_column(String(60), nullable=False, default="generic_v1", index=True)
    auth_mode: Mapped[str] = mapped_column(String(40), nullable=False, default="none")
    auth_reference: Mapped[str | None] = mapped_column(String(160), nullable=True)
    request_timeout_seconds: Mapped[int] = mapped_column(Integer, nullable=False, default=25)
    retry_limit: Mapped[int] = mapped_column(Integer, nullable=False, default=2)
    retry_backoff_seconds: Mapped[int] = mapped_column(Integer, nullable=False, default=3)
    sync_mode: Mapped[str] = mapped_column(String(40), nullable=False, default="manual", index=True)
    fetch_strategy: Mapped[str] = mapped_column(
        String(40),
        nullable=False,
        default="html_generic",
        index=True,
    )
    run_ai_enrichment: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    schedule_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, index=True)
    schedule_scope: Mapped[str] = mapped_column(String(40), nullable=False, default="due_sources")
    schedule_frequency: Mapped[str] = mapped_column(String(40), nullable=False, default="daily")
    schedule_batch_limit: Mapped[int] = mapped_column(Integer, nullable=False, default=50)
    next_scheduled_run_at: Mapped[DateTime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        index=True,
    )
    last_scheduled_run_at: Mapped[DateTime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    last_schedule_status: Mapped[str] = mapped_column(
        String(40),
        nullable=False,
        default="idle",
        index=True,
    )
    last_schedule_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    config_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    last_validation_at: Mapped[DateTime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    last_validation_status: Mapped[str] = mapped_column(String(40), nullable=False, default="idle", index=True)
    last_validation_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    last_sync_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True, index=True)
    last_sync_status: Mapped[str] = mapped_column(String(40), nullable=False, default="idle", index=True)
    last_sync_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
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
