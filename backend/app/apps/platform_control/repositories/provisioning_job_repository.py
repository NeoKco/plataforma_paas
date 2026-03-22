from datetime import datetime, timezone

from sqlalchemy import case, func, or_
from sqlalchemy.orm import Session, joinedload

from app.apps.platform_control.models.provisioning_job import ProvisioningJob
from app.apps.platform_control.models.tenant import Tenant


class ProvisioningJobRepository:
    def create(
        self,
        db: Session,
        tenant_id: int,
        job_type: str,
        status: str = "pending",
        max_attempts: int = 3,
    ) -> ProvisioningJob:
        job = ProvisioningJob(
            tenant_id=tenant_id,
            job_type=job_type,
            status=status,
            max_attempts=max_attempts,
        )
        db.add(job)
        db.commit()
        db.refresh(job)
        return job

    def list_all(self, db: Session) -> list[ProvisioningJob]:
        return db.query(ProvisioningJob).order_by(ProvisioningJob.id.desc()).all()

    def get_by_id(self, db: Session, job_id: int) -> ProvisioningJob | None:
        return db.query(ProvisioningJob).filter(ProvisioningJob.id == job_id).first()

    def list_by_ids(
        self,
        db: Session,
        job_ids: list[int],
    ) -> list[ProvisioningJob]:
        if not job_ids:
            return []

        rows = (
            db.query(ProvisioningJob)
            .options(joinedload(ProvisioningJob.tenant))
            .filter(ProvisioningJob.id.in_(job_ids))
            .all()
        )
        rows_by_id = {row.id: row for row in rows}
        return [rows_by_id[job_id] for job_id in job_ids if job_id in rows_by_id]

    def list_pending(
        self,
        db: Session,
        limit: int = 10,
        job_types: list[str] | None = None,
        priority_order: list[str] | None = None,
    ) -> list[ProvisioningJob]:
        now = datetime.now(timezone.utc)
        query = (
            db.query(ProvisioningJob)
            .options(joinedload(ProvisioningJob.tenant))
            .filter(ProvisioningJob.status.in_(["pending", "retry_pending"]))
            .filter(
                or_(
                    ProvisioningJob.next_retry_at.is_(None),
                    ProvisioningJob.next_retry_at <= now,
                )
            )
        )

        if job_types:
            query = query.filter(ProvisioningJob.job_type.in_(job_types))

        if priority_order:
            priority_index = {
                job_type: index for index, job_type in enumerate(priority_order)
            }
            query = query.order_by(
                case(
                    priority_index,
                    value=ProvisioningJob.job_type,
                    else_=len(priority_index),
                ).asc(),
                ProvisioningJob.id.asc(),
            )
        else:
            query = query.order_by(ProvisioningJob.id.asc())

        return query.limit(limit).all()

    def refresh(self, db: Session, job: ProvisioningJob) -> None:
        db.refresh(job)

    def list_recent_failed(
        self,
        db: Session,
        *,
        limit: int = 100,
        tenant_slug: str | None = None,
    ) -> list[ProvisioningJob]:
        query = (
            db.query(ProvisioningJob)
            .options(joinedload(ProvisioningJob.tenant))
            .join(Tenant, Tenant.id == ProvisioningJob.tenant_id)
            .filter(ProvisioningJob.status == "failed")
        )

        if tenant_slug:
            query = query.filter(Tenant.slug == tenant_slug)

        return (
            query.order_by(
                func.coalesce(
                    ProvisioningJob.last_attempt_at,
                    ProvisioningJob.created_at,
                ).desc(),
                ProvisioningJob.id.desc(),
            )
            .limit(limit)
            .all()
        )

    def summarize_by_tenant(self, db: Session) -> list[dict]:
        rows = (
            db.query(
                ProvisioningJob.tenant_id.label("tenant_id"),
                Tenant.slug.label("tenant_slug"),
                func.count(ProvisioningJob.id).label("total_jobs"),
                func.sum(
                    case((ProvisioningJob.status == "pending", 1), else_=0)
                ).label("pending_jobs"),
                func.sum(
                    case((ProvisioningJob.status == "retry_pending", 1), else_=0)
                ).label("retry_pending_jobs"),
                func.sum(
                    case((ProvisioningJob.status == "running", 1), else_=0)
                ).label("running_jobs"),
                func.sum(
                    case((ProvisioningJob.status == "completed", 1), else_=0)
                ).label("completed_jobs"),
                func.sum(
                    case((ProvisioningJob.status == "failed", 1), else_=0)
                ).label("failed_jobs"),
                func.max(ProvisioningJob.attempts).label("max_attempts_seen"),
            )
            .join(Tenant, Tenant.id == ProvisioningJob.tenant_id)
            .group_by(ProvisioningJob.tenant_id, Tenant.slug)
            .order_by(Tenant.slug.asc())
            .all()
        )

        return [
            {
                "tenant_id": row.tenant_id,
                "tenant_slug": row.tenant_slug,
                "total_jobs": int(row.total_jobs or 0),
                "pending_jobs": int(row.pending_jobs or 0),
                "retry_pending_jobs": int(row.retry_pending_jobs or 0),
                "running_jobs": int(row.running_jobs or 0),
                "completed_jobs": int(row.completed_jobs or 0),
                "failed_jobs": int(row.failed_jobs or 0),
                "max_attempts_seen": int(row.max_attempts_seen or 0),
            }
            for row in rows
        ]

    def summarize_by_tenant_and_job_type(self, db: Session) -> list[dict]:
        rows = (
            db.query(
                ProvisioningJob.tenant_id.label("tenant_id"),
                Tenant.slug.label("tenant_slug"),
                ProvisioningJob.job_type.label("job_type"),
                func.count(ProvisioningJob.id).label("total_jobs"),
                func.sum(
                    case((ProvisioningJob.status == "pending", 1), else_=0)
                ).label("pending_jobs"),
                func.sum(
                    case((ProvisioningJob.status == "retry_pending", 1), else_=0)
                ).label("retry_pending_jobs"),
                func.sum(
                    case((ProvisioningJob.status == "running", 1), else_=0)
                ).label("running_jobs"),
                func.sum(
                    case((ProvisioningJob.status == "completed", 1), else_=0)
                ).label("completed_jobs"),
                func.sum(
                    case((ProvisioningJob.status == "failed", 1), else_=0)
                ).label("failed_jobs"),
                func.max(ProvisioningJob.attempts).label("max_attempts_seen"),
            )
            .join(Tenant, Tenant.id == ProvisioningJob.tenant_id)
            .group_by(
                ProvisioningJob.tenant_id,
                Tenant.slug,
                ProvisioningJob.job_type,
            )
            .order_by(Tenant.slug.asc(), ProvisioningJob.job_type.asc())
            .all()
        )

        return [
            {
                "tenant_id": row.tenant_id,
                "tenant_slug": row.tenant_slug,
                "job_type": row.job_type,
                "total_jobs": int(row.total_jobs or 0),
                "pending_jobs": int(row.pending_jobs or 0),
                "retry_pending_jobs": int(row.retry_pending_jobs or 0),
                "running_jobs": int(row.running_jobs or 0),
                "completed_jobs": int(row.completed_jobs or 0),
                "failed_jobs": int(row.failed_jobs or 0),
                "max_attempts_seen": int(row.max_attempts_seen or 0),
            }
            for row in rows
        ]

    def summarize_by_tenant_and_error_code(self, db: Session) -> list[dict]:
        rows = (
            db.query(
                ProvisioningJob.tenant_id.label("tenant_id"),
                Tenant.slug.label("tenant_slug"),
                ProvisioningJob.error_code.label("error_code"),
                func.count(ProvisioningJob.id).label("total_jobs"),
                func.sum(
                    case((ProvisioningJob.status == "pending", 1), else_=0)
                ).label("pending_jobs"),
                func.sum(
                    case((ProvisioningJob.status == "retry_pending", 1), else_=0)
                ).label("retry_pending_jobs"),
                func.sum(
                    case((ProvisioningJob.status == "running", 1), else_=0)
                ).label("running_jobs"),
                func.sum(
                    case((ProvisioningJob.status == "completed", 1), else_=0)
                ).label("completed_jobs"),
                func.sum(
                    case((ProvisioningJob.status == "failed", 1), else_=0)
                ).label("failed_jobs"),
                func.max(ProvisioningJob.attempts).label("max_attempts_seen"),
            )
            .join(Tenant, Tenant.id == ProvisioningJob.tenant_id)
            .filter(ProvisioningJob.error_code.is_not(None))
            .group_by(
                ProvisioningJob.tenant_id,
                Tenant.slug,
                ProvisioningJob.error_code,
            )
            .order_by(Tenant.slug.asc(), ProvisioningJob.error_code.asc())
            .all()
        )

        return [
            {
                "tenant_id": row.tenant_id,
                "tenant_slug": row.tenant_slug,
                "error_code": row.error_code,
                "total_jobs": int(row.total_jobs or 0),
                "pending_jobs": int(row.pending_jobs or 0),
                "retry_pending_jobs": int(row.retry_pending_jobs or 0),
                "running_jobs": int(row.running_jobs or 0),
                "completed_jobs": int(row.completed_jobs or 0),
                "failed_jobs": int(row.failed_jobs or 0),
                "max_attempts_seen": int(row.max_attempts_seen or 0),
            }
            for row in rows
        ]
