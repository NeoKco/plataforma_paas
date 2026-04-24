from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.common.db.tenant_base import TenantBase


class TechDocsMeasurement(TenantBase):
    __tablename__ = "techdocs_measurements"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    dossier_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("techdocs_dossiers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    section_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("techdocs_sections.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    label: Mapped[str] = mapped_column(String(160), nullable=False)
    measured_value: Mapped[str | None] = mapped_column(String(160), nullable=True)
    unit: Mapped[str | None] = mapped_column(String(40), nullable=True)
    expected_range: Mapped[str | None] = mapped_column(String(160), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=100, index=True)
    created_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
