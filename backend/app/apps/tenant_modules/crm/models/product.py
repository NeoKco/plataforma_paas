from sqlalchemy import Boolean, DateTime, Float, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.common.db.tenant_base import TenantBase


class CRMProduct(TenantBase):
    __tablename__ = "crm_products"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    sku: Mapped[str | None] = mapped_column(String(80), nullable=True, unique=True, index=True)
    name: Mapped[str] = mapped_column(String(180), nullable=False, index=True)
    product_type: Mapped[str] = mapped_column(String(40), nullable=False, default="service", index=True)
    unit_label: Mapped[str | None] = mapped_column(String(40), nullable=True)
    unit_price: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, index=True)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=100, index=True)
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
