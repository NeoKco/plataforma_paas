from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.common.db.tenant_base import TenantBase


class BusinessSiteResponsible(TenantBase):
    __tablename__ = "business_site_responsibles"
    __table_args__ = (
        UniqueConstraint("site_id", "tenant_user_id", name="uq_business_site_responsible"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    site_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("business_sites.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    tenant_user_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    responsibility_kind: Mapped[str] = mapped_column(String(60), nullable=False, default="primary", index=True)
    is_primary: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, index=True)
    starts_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    ends_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
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
