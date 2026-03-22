from sqlalchemy.orm import Session

from app.apps.platform_control.models.provisioning_worker_cycle_trace import (
    ProvisioningWorkerCycleTrace,
)


class ProvisioningWorkerCycleTraceRepository:
    def create(
        self,
        db: Session,
        *,
        capture_key: str,
        worker_profile: str | None,
        selection_strategy: str,
        eligible_jobs: int,
        aged_eligible_jobs: int,
        queued_jobs: int,
        processed_count: int,
        failed_count: int,
        stopped_due_to_failure_limit: bool,
        duration_ms: int,
        priority_order_json: str,
        tenant_type_priority_order_json: str,
        top_eligible_job_scores_json: str,
    ) -> ProvisioningWorkerCycleTrace:
        trace = ProvisioningWorkerCycleTrace(
            capture_key=capture_key,
            worker_profile=worker_profile,
            selection_strategy=selection_strategy,
            eligible_jobs=eligible_jobs,
            aged_eligible_jobs=aged_eligible_jobs,
            queued_jobs=queued_jobs,
            processed_count=processed_count,
            failed_count=failed_count,
            stopped_due_to_failure_limit=stopped_due_to_failure_limit,
            duration_ms=duration_ms,
            priority_order_json=priority_order_json,
            tenant_type_priority_order_json=tenant_type_priority_order_json,
            top_eligible_job_scores_json=top_eligible_job_scores_json,
        )
        db.add(trace)
        db.commit()
        db.refresh(trace)
        return trace

    def list_recent(
        self,
        db: Session,
        *,
        limit: int = 50,
        worker_profile: str | None = None,
    ) -> list[ProvisioningWorkerCycleTrace]:
        query = db.query(ProvisioningWorkerCycleTrace)
        if worker_profile:
            query = query.filter(
                ProvisioningWorkerCycleTrace.worker_profile == worker_profile
            )

        return (
            query.order_by(
                ProvisioningWorkerCycleTrace.captured_at.desc(),
                ProvisioningWorkerCycleTrace.id.desc(),
            )
            .limit(limit)
            .all()
        )
