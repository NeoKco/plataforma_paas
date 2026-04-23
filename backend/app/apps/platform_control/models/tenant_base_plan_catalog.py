from sqlalchemy import Boolean, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.common.db.base import Base


class TenantBasePlanCatalog(Base):
    __tablename__ = "tenant_base_plan_catalog"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    plan_code: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    display_name: Mapped[str] = mapped_column(String(150), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    included_modules_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    default_billing_cycle: Mapped[str] = mapped_column(String(30), nullable=False)
    allowed_billing_cycles_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

