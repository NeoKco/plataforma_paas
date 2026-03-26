from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.common.db.tenant_base import TenantBase


class FinanceExchangeRate(TenantBase):
    __tablename__ = "finance_exchange_rates"
    __table_args__ = (
        UniqueConstraint(
            "source_currency_id",
            "target_currency_id",
            "effective_at",
            name="uq_finance_exchange_rates_pair_effective_at",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    source_currency_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("finance_currencies.id"),
        nullable=False,
        index=True,
    )
    target_currency_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("finance_currencies.id"),
        nullable=False,
        index=True,
    )
    rate: Mapped[float] = mapped_column(Float, nullable=False)
    effective_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    source: Mapped[str | None] = mapped_column(String(50), nullable=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
    )
