from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.common.db.tenant_base import TenantBase


class CRMProductIngestionDraft(TenantBase):
    __tablename__ = "crm_product_ingestion_drafts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    source_kind: Mapped[str] = mapped_column(String(40), nullable=False, default="manual_capture", index=True)
    source_label: Mapped[str | None] = mapped_column(String(180), nullable=True)
    source_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    external_reference: Mapped[str | None] = mapped_column(String(180), nullable=True, index=True)
    capture_status: Mapped[str] = mapped_column(String(40), nullable=False, default="draft", index=True)
    sku: Mapped[str | None] = mapped_column(String(80), nullable=True, index=True)
    name: Mapped[str | None] = mapped_column(String(180), nullable=True, index=True)
    brand: Mapped[str | None] = mapped_column(String(120), nullable=True)
    category_label: Mapped[str | None] = mapped_column(String(120), nullable=True)
    product_type: Mapped[str] = mapped_column(String(40), nullable=False, default="service", index=True)
    unit_label: Mapped[str | None] = mapped_column(String(40), nullable=True)
    unit_price: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    currency_code: Mapped[str] = mapped_column(String(12), nullable=False, default="CLP")
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    source_excerpt: Mapped[str | None] = mapped_column(Text, nullable=True)
    extraction_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    review_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by_user_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    reviewed_by_user_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    published_product_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("crm_products.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    published_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True, index=True)
    discarded_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True, index=True)
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
