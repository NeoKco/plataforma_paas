from sqlalchemy.orm import Session

from app.apps.platform_control.models.provisioning_job import ProvisioningJob
from app.apps.platform_control.repositories.provisioning_job_repository import (
    ProvisioningJobRepository,
)
from app.common.config.settings import settings


class ProvisioningJobService:
    def __init__(
        self,
        provisioning_job_repository: ProvisioningJobRepository | None = None,
    ):
        self.provisioning_job_repository = (
            provisioning_job_repository or ProvisioningJobRepository()
        )

    def create_job(
        self,
        db: Session,
        tenant_id: int,
        job_type: str,
        status: str = "pending",
        max_attempts: int | None = None,
    ) -> ProvisioningJob:
        return self.provisioning_job_repository.create(
            db=db,
            tenant_id=tenant_id,
            job_type=job_type,
            status=status,
            max_attempts=max_attempts or settings.PROVISIONING_JOB_MAX_ATTEMPTS,
        )

    def list_jobs(self, db: Session) -> list[ProvisioningJob]:
        return self.provisioning_job_repository.list_all(db)

    def list_recent_failed_jobs(
        self,
        db: Session,
        *,
        limit: int = 100,
        tenant_slug: str | None = None,
    ) -> list[ProvisioningJob]:
        return self.provisioning_job_repository.list_recent_failed(
            db=db,
            limit=limit,
            tenant_slug=tenant_slug,
        )

    def list_pending_jobs(
        self,
        db: Session,
        limit: int = 10,
        job_types: list[str] | None = None,
        priority_order: list[str] | None = None,
    ) -> list[ProvisioningJob]:
        return self.provisioning_job_repository.list_pending(
            db=db,
            limit=limit,
            job_types=job_types,
            priority_order=priority_order,
        )

    def summarize_jobs_by_tenant(self, db: Session) -> list[dict]:
        return self.provisioning_job_repository.summarize_by_tenant(db)

    def summarize_jobs_by_tenant_and_job_type(self, db: Session) -> list[dict]:
        return self.provisioning_job_repository.summarize_by_tenant_and_job_type(db)

    def summarize_jobs_by_tenant_and_error_code(self, db: Session) -> list[dict]:
        return self.provisioning_job_repository.summarize_by_tenant_and_error_code(db)
