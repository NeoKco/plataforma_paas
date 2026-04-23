from __future__ import annotations

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.common.db.base import Base


class TenantRuntimeSecretCampaignItem(Base):
    __tablename__ = "tenant_runtime_secret_campaign_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    campaign_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("tenant_runtime_secret_campaigns.id"),
        nullable=False,
        index=True,
    )
    tenant_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    tenant_slug: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    outcome: Mapped[str] = mapped_column(String(60), nullable=False, index=True)
    detail: Mapped[str | None] = mapped_column(Text, nullable=True)
    source: Mapped[str | None] = mapped_column(String(60), nullable=True)
    env_var_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    managed_secret_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    already_runtime_managed: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )
    rotated_at: Mapped[DateTime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    recorded_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    campaign: Mapped["TenantRuntimeSecretCampaign"] = relationship(
        "TenantRuntimeSecretCampaign",
        back_populates="items",
    )
