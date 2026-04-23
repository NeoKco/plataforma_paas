from __future__ import annotations

from sqlalchemy import DateTime, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.common.db.base import Base


class TenantRuntimeSecretCampaign(Base):
    __tablename__ = "tenant_runtime_secret_campaigns"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    campaign_type: Mapped[str] = mapped_column(String(60), nullable=False, index=True)
    scope_mode: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    tenant_slugs_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    excluded_tenant_slugs_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    processed: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    success_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    already_runtime_managed: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0
    )
    skipped_not_configured: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0
    )
    skipped_legacy_rescue_required: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0
    )
    failed: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    actor_user_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    actor_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    actor_role: Mapped[str | None] = mapped_column(String(100), nullable=True)
    recorded_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    items: Mapped[list["TenantRuntimeSecretCampaignItem"]] = relationship(
        "TenantRuntimeSecretCampaignItem",
        back_populates="campaign",
        cascade="all, delete-orphan",
        order_by="TenantRuntimeSecretCampaignItem.id.asc()",
    )
