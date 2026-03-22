from sqlalchemy import Boolean, DateTime, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.common.db.base import Base


class ProvisioningWorkerCycleTrace(Base):
    __tablename__ = "provisioning_worker_cycle_traces"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    capture_key: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    worker_profile: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    selection_strategy: Mapped[str] = mapped_column(String(100), nullable=False)
    eligible_jobs: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    aged_eligible_jobs: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    queued_jobs: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    processed_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    failed_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    stopped_due_to_failure_limit: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
    )
    duration_ms: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    priority_order_json: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
    tenant_type_priority_order_json: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        default="[]",
    )
    top_eligible_job_scores_json: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        default="[]",
    )
    captured_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
