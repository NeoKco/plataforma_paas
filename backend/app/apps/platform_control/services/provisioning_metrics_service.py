from uuid import uuid4

from sqlalchemy.orm import Session

from app.apps.platform_control.models.provisioning_job_metric_snapshot import (
    ProvisioningJobMetricSnapshot,
)
from app.apps.platform_control.repositories.provisioning_job_metric_snapshot_repository import (
    ProvisioningJobMetricSnapshotRepository,
)
from app.apps.platform_control.services.provisioning_job_service import (
    ProvisioningJobService,
)


class ProvisioningMetricsService:
    def __init__(
        self,
        provisioning_job_service: ProvisioningJobService | None = None,
        snapshot_repository: ProvisioningJobMetricSnapshotRepository | None = None,
    ):
        self.provisioning_job_service = (
            provisioning_job_service or ProvisioningJobService()
        )
        self.snapshot_repository = (
            snapshot_repository or ProvisioningJobMetricSnapshotRepository()
        )

    def capture_snapshot(
        self,
        db: Session,
        *,
        capture_key: str | None = None,
    ) -> list[ProvisioningJobMetricSnapshot]:
        summary = self.provisioning_job_service.summarize_jobs_by_tenant(db)
        return self.snapshot_repository.save_many(
            db,
            capture_key=capture_key or uuid4().hex,
            rows=summary,
        )

    def list_recent_snapshots(
        self,
        db: Session,
        *,
        limit: int = 50,
        tenant_slug: str | None = None,
    ) -> list[ProvisioningJobMetricSnapshot]:
        return self.snapshot_repository.list_recent(
            db,
            limit=limit,
            tenant_slug=tenant_slug,
        )
