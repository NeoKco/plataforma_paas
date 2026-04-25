from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.common.db.tenant_base import TenantBase


class ProductSource(TenantBase):
    __tablename__ = "products_product_sources"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    product_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("crm_products.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    connector_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("products_connectors.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    draft_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("crm_product_ingestion_drafts.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    run_item_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("crm_product_ingestion_run_items.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    source_kind: Mapped[str] = mapped_column(String(40), nullable=False, default="manual_capture", index=True)
    source_label: Mapped[str | None] = mapped_column(String(180), nullable=True)
    source_url: Mapped[str | None] = mapped_column(String(500), nullable=True, index=True)
    external_reference: Mapped[str | None] = mapped_column(String(180), nullable=True, index=True)
    source_status: Mapped[str] = mapped_column(String(40), nullable=False, default="active", index=True)
    sync_status: Mapped[str] = mapped_column(String(40), nullable=False, default="idle", index=True)
    refresh_mode: Mapped[str] = mapped_column(String(40), nullable=False, default="manual", index=True)
    refresh_merge_policy: Mapped[str] = mapped_column(String(40), nullable=False, default="safe_merge")
    refresh_prompt: Mapped[str | None] = mapped_column(Text, nullable=True)
    latest_unit_price: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    currency_code: Mapped[str] = mapped_column(String(12), nullable=False, default="CLP")
    source_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    captured_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True, index=True)
    last_seen_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True, index=True)
    last_sync_attempt_at: Mapped[DateTime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        index=True,
    )
    next_refresh_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True, index=True)
    last_refresh_success_at: Mapped[DateTime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        index=True,
    )
    last_sync_error: Mapped[str | None] = mapped_column(Text, nullable=True)
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
