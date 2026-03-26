from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.common.db.tenant_base import TenantBase


class FinanceAccount(TenantBase):
    __tablename__ = "finance_accounts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    code: Mapped[str | None] = mapped_column(String(60), nullable=True, unique=True)
    account_type: Mapped[str] = mapped_column(String(30), nullable=False, index=True)
    currency_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("finance_currencies.id"),
        nullable=False,
        index=True,
    )
    parent_account_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("finance_accounts.id"),
        nullable=True,
        index=True,
    )
    opening_balance: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    opening_balance_at: Mapped[DateTime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    icon: Mapped[str | None] = mapped_column(String(50), nullable=True)
    is_favorite: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_balance_hidden: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
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
