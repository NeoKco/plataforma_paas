from sqlalchemy import DateTime, ForeignKey, Integer, func
from sqlalchemy.orm import Mapped, mapped_column

from app.common.db.tenant_base import TenantBase


class FinanceTransactionTag(TenantBase):
    __tablename__ = "finance_transaction_tags"

    transaction_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("finance_transactions.id"),
        primary_key=True,
    )
    tag_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("finance_tags.id"),
        primary_key=True,
        index=True,
    )
    created_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
