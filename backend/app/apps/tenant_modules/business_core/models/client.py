from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.common.db.tenant_base import TenantBase


class BusinessClient(TenantBase):
    __tablename__ = "business_clients"
    __table_args__ = (
        UniqueConstraint("organization_id", name="uq_business_clients_organization_id"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    organization_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("business_organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    client_code: Mapped[str | None] = mapped_column(String(60), nullable=True, unique=True, index=True)
    service_status: Mapped[str] = mapped_column(String(40), nullable=False, default="active", index=True)
    commercial_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
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
