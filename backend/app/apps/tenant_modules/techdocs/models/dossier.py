from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.common.db.tenant_base import TenantBase


class TechDocsDossier(TenantBase):
    __tablename__ = "techdocs_dossiers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    client_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("business_clients.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    site_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("business_sites.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    installation_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("maintenance_installations.id", ondelete="SET NULL"),
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
    owner_user_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    title: Mapped[str] = mapped_column(String(180), nullable=False, index=True)
    dossier_type: Mapped[str] = mapped_column(String(40), nullable=False, default="custom", index=True)
    status: Mapped[str] = mapped_column(String(40), nullable=False, default="draft", index=True)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    objective: Mapped[str | None] = mapped_column(Text, nullable=True)
    scope_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    technical_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    approved_by_user_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    approved_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, index=True)
    created_by_user_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    updated_by_user_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
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
