from sqlalchemy.orm import Session

from app.apps.platform_control.models.provisioning_job_metric_snapshot import (
    ProvisioningJobMetricSnapshot,
)


class ProvisioningJobMetricSnapshotRepository:
    def save_many(
        self,
        db: Session,
        *,
        capture_key: str,
        rows: list[dict],
    ) -> list[ProvisioningJobMetricSnapshot]:
        snapshots = [
            ProvisioningJobMetricSnapshot(
                capture_key=capture_key,
                tenant_id=row["tenant_id"],
                tenant_slug=row["tenant_slug"],
                total_jobs=row["total_jobs"],
                pending_jobs=row["pending_jobs"],
                retry_pending_jobs=row["retry_pending_jobs"],
                running_jobs=row["running_jobs"],
                completed_jobs=row["completed_jobs"],
                failed_jobs=row["failed_jobs"],
                max_attempts_seen=row["max_attempts_seen"],
            )
            for row in rows
        ]

        if not snapshots:
            return []

        db.add_all(snapshots)
        db.commit()
        for snapshot in snapshots:
            db.refresh(snapshot)
        return snapshots

    def list_recent(
        self,
        db: Session,
        *,
        limit: int = 50,
        tenant_slug: str | None = None,
    ) -> list[ProvisioningJobMetricSnapshot]:
        query = db.query(ProvisioningJobMetricSnapshot)
        if tenant_slug:
            query = query.filter(
                ProvisioningJobMetricSnapshot.tenant_slug == tenant_slug
            )

        return (
            query.order_by(
                ProvisioningJobMetricSnapshot.captured_at.desc(),
                ProvisioningJobMetricSnapshot.id.desc(),
            )
            .limit(limit)
            .all()
        )
