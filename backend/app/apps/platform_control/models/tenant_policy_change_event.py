from sqlalchemy import DateTime, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.common.db.base import Base


class TenantPolicyChangeEvent(Base):
    __tablename__ = "tenant_policy_change_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    tenant_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    tenant_slug: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    event_type: Mapped[str] = mapped_column(String(60), nullable=False, index=True)
    actor_user_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    actor_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    actor_role: Mapped[str | None] = mapped_column(String(100), nullable=True)
    previous_state_json: Mapped[str] = mapped_column(Text, nullable=False)
    new_state_json: Mapped[str] = mapped_column(Text, nullable=False)
    changed_fields_json: Mapped[str] = mapped_column(Text, nullable=False)
    recorded_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
