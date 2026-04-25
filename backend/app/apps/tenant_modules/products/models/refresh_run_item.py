from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.common.db.tenant_base import TenantBase


class ProductRefreshRunItem(TenantBase):
    __tablename__ = "products_refresh_run_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    run_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("products_refresh_runs.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    product_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("crm_products.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    product_source_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("products_product_sources.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    item_status: Mapped[str] = mapped_column(String(40), nullable=False, default="queued", index=True)
    source_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    source_label: Mapped[str | None] = mapped_column(String(180), nullable=True)
    merge_policy: Mapped[str] = mapped_column(String(40), nullable=False, default="safe_merge")
    used_ai_enrichment: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    detected_changes_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    processed_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True, index=True)
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
