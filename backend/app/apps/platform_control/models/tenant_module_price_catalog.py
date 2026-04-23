from sqlalchemy import Boolean, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.common.db.base import Base


class TenantModulePriceCatalog(Base):
    __tablename__ = "tenant_module_price_catalog"
    __table_args__ = (
        UniqueConstraint("module_catalog_id", "billing_cycle", name="uq_module_cycle"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    module_catalog_id: Mapped[int] = mapped_column(
        ForeignKey("tenant_module_catalog.id"),
        nullable=False,
        index=True,
    )
    billing_cycle: Mapped[str] = mapped_column(String(30), nullable=False)
    price_reference_cents: Mapped[int | None] = mapped_column(Integer, nullable=True)
    commitment_discount_percent: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    module_catalog = relationship(
        "TenantModuleCatalog",
        back_populates="price_catalog",
    )

