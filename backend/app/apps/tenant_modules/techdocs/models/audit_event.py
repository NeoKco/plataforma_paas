from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.common.db.tenant_base import TenantBase


class TechDocsAuditEvent(TenantBase):
    __tablename__ = "techdocs_audit_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    dossier_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("techdocs_dossiers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    event_type: Mapped[str] = mapped_column(String(60), nullable=False, index=True)
    summary: Mapped[str | None] = mapped_column(String(200), nullable=True)
    payload_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by_user_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
    )
