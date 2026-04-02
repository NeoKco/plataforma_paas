from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.common.db.tenant_base import TenantBase


class MaintenanceInstallation(TenantBase):
    __tablename__ = "maintenance_installations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    site_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("business_sites.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    equipment_type_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("maintenance_equipment_types.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(150), nullable=False, index=True)
    serial_number: Mapped[str | None] = mapped_column(String(120), nullable=True, index=True)
    manufacturer: Mapped[str | None] = mapped_column(String(120), nullable=True)
    model: Mapped[str | None] = mapped_column(String(120), nullable=True)
    installed_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_service_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    warranty_until: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    installation_status: Mapped[str] = mapped_column(String(40), nullable=False, default="active", index=True)
    location_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    technical_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, index=True)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=100, index=True)
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
    )
