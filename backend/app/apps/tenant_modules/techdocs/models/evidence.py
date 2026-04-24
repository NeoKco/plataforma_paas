from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.common.db.tenant_base import TenantBase


class TechDocsEvidence(TenantBase):
    __tablename__ = "techdocs_evidences"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    dossier_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("techdocs_dossiers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    evidence_kind: Mapped[str] = mapped_column(String(40), nullable=False, default="photo", index=True)
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    storage_key: Mapped[str] = mapped_column(String(255), nullable=False)
    content_type: Mapped[str | None] = mapped_column(String(120), nullable=True)
    file_size: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    uploaded_by_user_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
    )
