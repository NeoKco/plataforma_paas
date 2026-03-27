from datetime import date

from sqlalchemy import Boolean, Date, DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.common.db.tenant_base import TenantBase


class FinanceTransaction(TenantBase):
    __tablename__ = "finance_transactions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    transaction_type: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    account_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("finance_accounts.id"),
        nullable=True,
        index=True,
    )
    target_account_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("finance_accounts.id"),
        nullable=True,
        index=True,
    )
    category_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("finance_categories.id"),
        nullable=True,
        index=True,
    )
    beneficiary_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("finance_beneficiaries.id"),
        nullable=True,
        index=True,
    )
    person_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("finance_people.id"),
        nullable=True,
        index=True,
    )
    project_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("finance_projects.id"),
        nullable=True,
        index=True,
    )
    currency_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("finance_currencies.id"),
        nullable=False,
        index=True,
    )
    loan_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    amount_in_base_currency: Mapped[float | None] = mapped_column(Float, nullable=True)
    exchange_rate: Mapped[float | None] = mapped_column(Float, nullable=True)
    discount_amount: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    amortization_months: Mapped[int | None] = mapped_column(Integer, nullable=True)
    transaction_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        index=True,
    )
    alternative_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    description: Mapped[str] = mapped_column(String(255), nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_favorite: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    favorite_flag: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_reconciled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, index=True)
    reconciled_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    is_template_origin: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    planner_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    template_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    source_type: Mapped[str | None] = mapped_column(String(60), nullable=True)
    source_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_by_user_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    updated_by_user_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    updated_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
