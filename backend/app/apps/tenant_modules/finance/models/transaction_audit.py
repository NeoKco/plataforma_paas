from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.common.db.tenant_base import TenantBase


class FinanceTransactionAudit(TenantBase):
    __tablename__ = "finance_transaction_audit"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    transaction_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("finance_transactions.id"),
        nullable=False,
        index=True,
    )
    event_type: Mapped[str] = mapped_column(String(60), nullable=False, index=True)
    actor_user_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    summary: Mapped[str] = mapped_column(String(255), nullable=False)
    payload_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
