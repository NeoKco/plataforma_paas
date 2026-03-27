from sqlalchemy import (
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


class FinanceLoanInstallment(TenantBase):
    __tablename__ = "finance_loan_installments"
    __table_args__ = (
        CheckConstraint("installment_number > 0", name="chk_finance_loan_installments_number_positive"),
        CheckConstraint("planned_amount > 0", name="chk_finance_loan_installments_planned_positive"),
        CheckConstraint("principal_amount >= 0", name="chk_finance_loan_installments_principal_non_negative"),
        CheckConstraint("interest_amount >= 0", name="chk_finance_loan_installments_interest_non_negative"),
        CheckConstraint("paid_amount >= 0", name="chk_finance_loan_installments_paid_non_negative"),
        CheckConstraint(
            "paid_principal_amount >= 0",
            name="chk_finance_loan_installments_paid_principal_non_negative",
        ),
        CheckConstraint(
            "paid_interest_amount >= 0",
            name="chk_finance_loan_installments_paid_interest_non_negative",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    loan_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("finance_loans.id"),
        nullable=False,
        index=True,
    )
    installment_number: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    due_date: Mapped[Date] = mapped_column(Date, nullable=False, index=True)
    planned_amount: Mapped[float] = mapped_column(Float, nullable=False)
    principal_amount: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    interest_amount: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    paid_amount: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    paid_principal_amount: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    paid_interest_amount: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    paid_at: Mapped[Date | None] = mapped_column(Date, nullable=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
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
