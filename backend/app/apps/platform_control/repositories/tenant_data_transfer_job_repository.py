from sqlalchemy.orm import Session, joinedload

from app.apps.platform_control.models.tenant_data_transfer_job import TenantDataTransferJob


class TenantDataTransferJobRepository:
    def create(
        self,
        db: Session,
        *,
        tenant_id: int,
        direction: str,
        data_format: str,
        export_scope: str,
        status: str,
        requested_by_email: str | None = None,
    ) -> TenantDataTransferJob:
        job = TenantDataTransferJob(
            tenant_id=tenant_id,
            direction=direction,
            data_format=data_format,
            export_scope=export_scope,
            status=status,
            requested_by_email=requested_by_email,
        )
        db.add(job)
        db.commit()
        db.refresh(job)
        return job

    def save(self, db: Session, job: TenantDataTransferJob) -> TenantDataTransferJob:
        db.add(job)
        db.commit()
        db.refresh(job)
        return job

    def get_by_id(self, db: Session, job_id: int) -> TenantDataTransferJob | None:
        return (
            db.query(TenantDataTransferJob)
            .options(joinedload(TenantDataTransferJob.artifacts))
            .filter(TenantDataTransferJob.id == job_id)
            .first()
        )

    def list_by_tenant(
        self,
        db: Session,
        tenant_id: int,
        *,
        limit: int = 10,
        direction: str | None = None,
    ) -> list[TenantDataTransferJob]:
        query = (
            db.query(TenantDataTransferJob)
            .options(joinedload(TenantDataTransferJob.artifacts))
            .filter(TenantDataTransferJob.tenant_id == tenant_id)
        )
        if direction:
            query = query.filter(TenantDataTransferJob.direction == direction)
        return query.order_by(TenantDataTransferJob.id.desc()).limit(limit).all()
