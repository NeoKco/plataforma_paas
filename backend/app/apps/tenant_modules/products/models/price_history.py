from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.common.db.tenant_base import TenantBase


class ProductPriceHistory(TenantBase):
    __tablename__ = "products_price_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
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
    price_kind: Mapped[str] = mapped_column(String(40), nullable=False, default="reference", index=True)
    unit_price: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    currency_code: Mapped[str] = mapped_column(String(12), nullable=False, default="CLP")
    source_label: Mapped[str | None] = mapped_column(String(180), nullable=True)
    source_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    captured_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
    )
    created_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
    )
