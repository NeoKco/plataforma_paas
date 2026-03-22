from sqlalchemy import DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.common.db.base import Base


class AuthToken(Base):
    __tablename__ = "auth_tokens"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    jti: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    subject_scope: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    subject_user_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    tenant_slug: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    token_type: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    audience: Mapped[str] = mapped_column(String(100), nullable=False)
    issued_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=False)
    expires_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=False)
    revoked_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    replaced_by_jti: Mapped[str | None] = mapped_column(String(100), nullable=True)
    created_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
