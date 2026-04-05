from sqlalchemy import DateTime, ForeignKey, Integer, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.common.db.tenant_base import TenantBase


class BusinessTaskTypeFunctionProfile(TenantBase):
    __tablename__ = "business_task_type_function_profiles"
    __table_args__ = (
        UniqueConstraint(
            "task_type_id",
            "function_profile_id",
            name="uq_business_task_type_function_profile",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    task_type_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("business_task_types.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    function_profile_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("business_function_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    created_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
    )
