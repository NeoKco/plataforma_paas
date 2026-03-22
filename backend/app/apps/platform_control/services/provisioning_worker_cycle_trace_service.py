import json
from uuid import uuid4
from typing import TYPE_CHECKING

from sqlalchemy.orm import Session

from app.apps.platform_control.models.provisioning_worker_cycle_trace import (
    ProvisioningWorkerCycleTrace,
)
from app.apps.platform_control.repositories.provisioning_worker_cycle_trace_repository import (
    ProvisioningWorkerCycleTraceRepository,
)

if TYPE_CHECKING:
    from app.workers.provisioning_worker import ProvisioningWorkerCycleResult


class ProvisioningWorkerCycleTraceService:
    def __init__(
        self,
        trace_repository: ProvisioningWorkerCycleTraceRepository | None = None,
    ):
        self.trace_repository = (
            trace_repository or ProvisioningWorkerCycleTraceRepository()
        )

    def save_cycle_trace(
        self,
        db: Session,
        *,
        cycle_result: "ProvisioningWorkerCycleResult",
        capture_key: str | None = None,
    ) -> ProvisioningWorkerCycleTrace:
        return self.trace_repository.create(
            db,
            capture_key=capture_key or uuid4().hex,
            worker_profile=cycle_result.worker_profile,
            selection_strategy=cycle_result.selection_strategy,
            eligible_jobs=cycle_result.eligible_jobs,
            aged_eligible_jobs=cycle_result.aged_eligible_jobs,
            queued_jobs=cycle_result.queued_jobs,
            processed_count=len(cycle_result.processed_job_ids),
            failed_count=len(cycle_result.failed_job_ids),
            stopped_due_to_failure_limit=cycle_result.stopped_due_to_failure_limit,
            duration_ms=max(int(cycle_result.duration_seconds * 1000), 0),
            priority_order_json=json.dumps(cycle_result.priority_order, sort_keys=True),
            tenant_type_priority_order_json=json.dumps(
                cycle_result.tenant_type_priority_order,
                sort_keys=True,
            ),
            top_eligible_job_scores_json=json.dumps(
                cycle_result.top_eligible_job_scores,
                sort_keys=True,
            ),
        )

    def list_recent_traces(
        self,
        db: Session,
        *,
        limit: int = 50,
        worker_profile: str | None = None,
    ) -> list[ProvisioningWorkerCycleTrace]:
        return self.trace_repository.list_recent(
            db,
            limit=limit,
            worker_profile=worker_profile,
        )
