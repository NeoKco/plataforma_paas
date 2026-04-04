from sqlalchemy import DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.common.db.tenant_base import TenantBase


class TenantInfo(TenantBase):
    __tablename__ = "tenant_info"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    tenant_name: Mapped[str] = mapped_column(String(150), nullable=False)
    tenant_slug: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    tenant_type: Mapped[str] = mapped_column(String(50), nullable=False)
    timezone: Mapped[str] = mapped_column(String(64), nullable=False, default="America/Santiago")
    created_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
