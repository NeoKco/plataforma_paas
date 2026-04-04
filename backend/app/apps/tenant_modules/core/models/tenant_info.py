from sqlalchemy import Boolean, DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.common.db.tenant_base import TenantBase


class TenantInfo(TenantBase):
    __tablename__ = "tenant_info"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    tenant_name: Mapped[str] = mapped_column(String(150), nullable=False)
    tenant_slug: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    tenant_type: Mapped[str] = mapped_column(String(50), nullable=False)
    timezone: Mapped[str] = mapped_column(String(64), nullable=False, default="America/Santiago")
    maintenance_finance_sync_mode: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="manual",
    )
    maintenance_finance_auto_sync_income: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
    )
    maintenance_finance_auto_sync_expense: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
    )
    maintenance_finance_income_account_id: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )
    maintenance_finance_expense_account_id: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )
    maintenance_finance_income_category_id: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )
    maintenance_finance_expense_category_id: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )
    maintenance_finance_currency_id: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )
    created_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
