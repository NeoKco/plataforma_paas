from sqlalchemy import DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.common.db.base import Base


class ProvisioningJobMetricSnapshot(Base):
    __tablename__ = "provisioning_job_metric_snapshots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    capture_key: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    tenant_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    tenant_slug: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    total_jobs: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    pending_jobs: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    retry_pending_jobs: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    running_jobs: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    completed_jobs: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    failed_jobs: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    max_attempts_seen: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    captured_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
