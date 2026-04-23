from sqlalchemy import DateTime, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.common.db.base import Base


class AuthAuditEvent(Base):
    __tablename__ = "auth_audit_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    event_type: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    subject_scope: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    outcome: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    subject_user_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    tenant_slug: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    email: Mapped[str | None] = mapped_column(String(150), nullable=True, index=True)
    token_jti: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    request_id: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    request_path: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    request_method: Mapped[str | None] = mapped_column(String(16), nullable=True, index=True)
    detail: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
