from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.common.db.base import Base


class TenantSubscriptionItem(Base):
    __tablename__ = "tenant_subscription_items"
    __table_args__ = (
        UniqueConstraint("tenant_subscription_id", "module_key", name="uq_tenant_subscription_module"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tenant_subscription_id: Mapped[int] = mapped_column(
        ForeignKey("tenant_subscriptions.id"),
        nullable=False,
        index=True,
    )
    module_key: Mapped[str] = mapped_column(String(100), nullable=False)
    item_kind: Mapped[str] = mapped_column(String(30), nullable=False)
    billing_cycle: Mapped[str | None] = mapped_column(String(30), nullable=True)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="active")
    starts_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    renews_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    ends_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    is_prorated: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    subscription = relationship(
        "TenantSubscription",
        back_populates="items",
    )

