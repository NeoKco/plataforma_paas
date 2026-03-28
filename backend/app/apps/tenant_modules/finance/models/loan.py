from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.common.db.tenant_base import TenantBase


class FinanceLoan(TenantBase):
    __tablename__ = "finance_loans"
    __table_args__ = (
        CheckConstraint("principal_amount > 0", name="chk_finance_loans_principal_positive"),
        CheckConstraint("current_balance >= 0", name="chk_finance_loans_balance_non_negative"),
        CheckConstraint(
            "interest_rate IS NULL OR interest_rate >= 0",
            name="chk_finance_loans_interest_non_negative",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    loan_type: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    counterparty_name: Mapped[str] = mapped_column(String(150), nullable=False, index=True)
    currency_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("finance_currencies.id"),
        nullable=False,
        index=True,
    )
    account_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("finance_accounts.id"),
        nullable=True,
        index=True,
    )
    principal_amount: Mapped[float] = mapped_column(Float, nullable=False)
    current_balance: Mapped[float] = mapped_column(Float, nullable=False)
    interest_rate: Mapped[float | None] = mapped_column(Float, nullable=True)
    installments_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    payment_frequency: Mapped[str] = mapped_column(String(20), nullable=False, default="monthly")
    start_date: Mapped[Date] = mapped_column(Date, nullable=False, index=True)
    due_date: Mapped[Date | None] = mapped_column(Date, nullable=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, index=True)
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
