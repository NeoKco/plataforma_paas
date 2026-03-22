from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.common.db.tenant_base import TenantBase


class Role(TenantBase):
    __tablename__ = "roles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)