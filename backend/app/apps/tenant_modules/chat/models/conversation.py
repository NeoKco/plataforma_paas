from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.common.db.tenant_base import TenantBase


class ChatConversation(TenantBase):
    __tablename__ = "chat_conversations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    conversation_kind: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="direct",
        index=True,
    )
    context_type: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="general",
        index=True,
    )
    client_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("business_clients.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    opportunity_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("crm_opportunities.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    work_order_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("maintenance_work_orders.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    task_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("taskops_tasks.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    title: Mapped[str | None] = mapped_column(String(180), nullable=True, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by_user_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    last_message_at: Mapped[DateTime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        index=True,
    )
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
        index=True,
    )
