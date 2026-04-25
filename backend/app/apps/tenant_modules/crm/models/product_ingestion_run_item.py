from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.common.db.tenant_base import TenantBase


class CRMProductIngestionRunItem(TenantBase):
    __tablename__ = "crm_product_ingestion_run_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    run_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("crm_product_ingestion_runs.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    source_url: Mapped[str] = mapped_column(String(500), nullable=False)
    source_label: Mapped[str | None] = mapped_column(String(180), nullable=True)
    external_reference: Mapped[str | None] = mapped_column(String(180), nullable=True, index=True)
    item_status: Mapped[str] = mapped_column(String(40), nullable=False, default="queued", index=True)
    draft_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("crm_product_ingestion_drafts.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    extracted_name: Mapped[str | None] = mapped_column(String(180), nullable=True)
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
