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
    config_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    last_sync_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True, index=True)
    last_sync_status: Mapped[str] = mapped_column(String(40), nullable=False, default="idle", index=True)
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
