from sqlalchemy import DateTime, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.common.db.tenant_base import TenantBase


class BusinessCoreMergeAudit(TenantBase):
    __tablename__ = "business_core_merge_audits"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    entity_kind: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    entity_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    summary: Mapped[str] = mapped_column(String(255), nullable=False)
    payload_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    requested_by_user_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    requested_by_email: Mapped[str | None] = mapped_column(String(150), nullable=True, index=True)
    requested_by_role: Mapped[str | None] = mapped_column(String(80), nullable=True, index=True)
    created_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
    )
