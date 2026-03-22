from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.apps.platform_control.schemas import (
    ProvisioningBrokerDeadLetterJobResponse,
    ProvisioningBrokerDeadLetterResponse,
    ProvisioningBrokerRequeueRequest,
    ProvisioningBrokerRequeueResponse,
    ProvisioningJobDetailedMetricsResponse,
    ProvisioningJobErrorCodeMetricsResponse,
    ProvisioningOperationalAlertResponse,
    ProvisioningOperationalAlertHistoryEntryResponse,
    ProvisioningOperationalAlertHistoryResponse,
    ProvisioningOperationalAlertsResponse,
    ProvisioningJobMetricsHistoryResponse,
    ProvisioningJobMetricsResponse,
    ProvisioningJobMetricSnapshotResponse,
    ProvisioningJobResponse,
    ProvisioningJobTenantJobTypeSummary,
    ProvisioningJobTenantErrorCodeSummary,
    ProvisioningJobTenantSummary,
    ProvisioningWorkerCycleTraceHistoryResponse,
    ProvisioningWorkerCycleTraceResponse,
)
from app.apps.platform_control.services.provisioning_job_service import (
    ProvisioningJobService,
)
from app.apps.platform_control.services.provisioning_metrics_service import (
    ProvisioningMetricsService,
)
from app.apps.platform_control.services.provisioning_alert_service import (
    ProvisioningAlertService,
)
from app.apps.platform_control.services.provisioning_worker_cycle_trace_service import (
    ProvisioningWorkerCycleTraceService,
)
from app.apps.provisioning.services.provisioning_service import ProvisioningService
from app.apps.provisioning.services.provisioning_dispatch_service import (
    ProvisioningDispatchService,
)
from app.common.auth.role_dependencies import require_role
from app.common.db.session_manager import get_control_db

router = APIRouter(prefix="/platform/provisioning-jobs", tags=["platform-provisioning"])
provisioning_job_service = ProvisioningJobService()
provisioning_dispatch_service = ProvisioningDispatchService()
provisioning_metrics_service = ProvisioningMetricsService()
provisioning_alert_service = ProvisioningAlertService()
provisioning_worker_cycle_trace_service = ProvisioningWorkerCycleTraceService()
provisioning_service = ProvisioningService(
    provisioning_dispatch_service=provisioning_dispatch_service
)


@router.get("/", response_model=list[ProvisioningJobResponse])
def list_provisioning_jobs(
    db: Session = Depends(get_control_db),
    _token: dict = Depends(require_role("superadmin")),
) -> list[ProvisioningJobResponse]:
    jobs = provisioning_job_service.list_jobs(db)
    return [ProvisioningJobResponse.model_validate(job) for job in jobs]


@router.get("/metrics", response_model=ProvisioningJobMetricsResponse)
def provisioning_job_metrics(
    db: Session = Depends(get_control_db),
    _token: dict = Depends(require_role("superadmin")),
) -> ProvisioningJobMetricsResponse:
    summary = provisioning_job_service.summarize_jobs_by_tenant(db)
    return ProvisioningJobMetricsResponse(
        success=True,
        message="Metricas de provisioning recuperadas correctamente",
        total_tenants=len(summary),
        data=[ProvisioningJobTenantSummary(**item) for item in summary],
    )


@router.get("/broker/dlq", response_model=ProvisioningBrokerDeadLetterResponse)
def provisioning_broker_dead_letter_jobs(
    limit: int = 50,
    job_type: str | None = None,
    tenant_slug: str | None = None,
    error_code: str | None = None,
    error_contains: str | None = None,
    db: Session = Depends(get_control_db),
    _token: dict = Depends(require_role("superadmin")),
) -> ProvisioningBrokerDeadLetterResponse:
    jobs = provisioning_dispatch_service.list_dead_letter_jobs(
        db,
        limit=limit,
        job_type=job_type,
        tenant_slug=tenant_slug,
        error_code=error_code,
        error_contains=error_contains,
    )
    return ProvisioningBrokerDeadLetterResponse(
        success=True,
        message="DLQ de provisioning recuperada correctamente",
        total_jobs=len(jobs),
        data=[
            ProvisioningBrokerDeadLetterJobResponse(
                job_id=item["job"].id,
                tenant_id=item["job"].tenant_id,
                job_type=item["job"].job_type,
                status=item["job"].status,
                attempts=item["job"].attempts,
                max_attempts=item["job"].max_attempts,
                error_code=getattr(item["job"], "error_code", None),
                error_message=item["job"].error_message,
                recorded_at=item["recorded_at"],
            )
            for item in jobs
        ],
    )


@router.post("/{job_id}/requeue", response_model=ProvisioningJobResponse)
def requeue_provisioning_job(
    job_id: int,
    reset_attempts: bool = True,
    delay_seconds: int = 0,
    db: Session = Depends(get_control_db),
    _token: dict = Depends(require_role("superadmin")),
) -> ProvisioningJobResponse:
    try:
        job = provisioning_service.requeue_failed_job(
            db,
            job_id,
            reset_attempts=reset_attempts,
            delay_seconds=delay_seconds,
        )
        return ProvisioningJobResponse.model_validate(job)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post(
    "/broker/dlq/requeue",
    response_model=ProvisioningBrokerRequeueResponse,
)
def requeue_provisioning_broker_dead_letter_jobs(
    payload: ProvisioningBrokerRequeueRequest,
    db: Session = Depends(get_control_db),
    _token: dict = Depends(require_role("superadmin")),
) -> ProvisioningBrokerRequeueResponse:
    jobs = provisioning_service.requeue_failed_jobs(
        db,
        limit=payload.limit,
        job_type=payload.job_type,
        tenant_slug=payload.tenant_slug,
        error_code=payload.error_code,
        error_contains=payload.error_contains,
        reset_attempts=payload.reset_attempts,
        delay_seconds=payload.delay_seconds,
    )
    return ProvisioningBrokerRequeueResponse(
        success=True,
        message="Jobs de provisioning reencolados correctamente desde la DLQ",
        total_jobs=len(jobs),
        data=[ProvisioningJobResponse.model_validate(job) for job in jobs],
    )


@router.get("/metrics/by-job-type", response_model=ProvisioningJobDetailedMetricsResponse)
def provisioning_job_metrics_by_job_type(
    db: Session = Depends(get_control_db),
    _token: dict = Depends(require_role("superadmin")),
) -> ProvisioningJobDetailedMetricsResponse:
    summary = provisioning_job_service.summarize_jobs_by_tenant_and_job_type(db)
    return ProvisioningJobDetailedMetricsResponse(
        success=True,
        message="Metricas detalladas de provisioning recuperadas correctamente",
        total_rows=len(summary),
        data=[ProvisioningJobTenantJobTypeSummary(**item) for item in summary],
    )


@router.get(
    "/metrics/by-error-code",
    response_model=ProvisioningJobErrorCodeMetricsResponse,
)
def provisioning_job_metrics_by_error_code(
    db: Session = Depends(get_control_db),
    _token: dict = Depends(require_role("superadmin")),
) -> ProvisioningJobErrorCodeMetricsResponse:
    summary = provisioning_job_service.summarize_jobs_by_tenant_and_error_code(db)
    return ProvisioningJobErrorCodeMetricsResponse(
        success=True,
        message="Metricas de provisioning por error_code recuperadas correctamente",
        total_rows=len(summary),
        data=[ProvisioningJobTenantErrorCodeSummary(**item) for item in summary],
    )


@router.get("/metrics/history", response_model=ProvisioningJobMetricsHistoryResponse)
def provisioning_job_metrics_history(
    limit: int = 50,
    tenant_slug: str | None = None,
    db: Session = Depends(get_control_db),
    _token: dict = Depends(require_role("superadmin")),
) -> ProvisioningJobMetricsHistoryResponse:
    snapshots = provisioning_metrics_service.list_recent_snapshots(
        db,
        limit=limit,
        tenant_slug=tenant_slug,
    )
    return ProvisioningJobMetricsHistoryResponse(
        success=True,
        message="Historial de metricas de provisioning recuperado correctamente",
        total_snapshots=len(snapshots),
        data=[
            ProvisioningJobMetricSnapshotResponse.model_validate(snapshot)
            for snapshot in snapshots
        ],
    )


@router.get(
    "/metrics/cycle-history",
    response_model=ProvisioningWorkerCycleTraceHistoryResponse,
)
def provisioning_job_cycle_history(
    limit: int = 50,
    worker_profile: str | None = None,
    db: Session = Depends(get_control_db),
    _token: dict = Depends(require_role("superadmin")),
) -> ProvisioningWorkerCycleTraceHistoryResponse:
    traces = provisioning_worker_cycle_trace_service.list_recent_traces(
        db,
        limit=limit,
        worker_profile=worker_profile,
    )
    return ProvisioningWorkerCycleTraceHistoryResponse(
        success=True,
        message="Historial de ciclos de provisioning recuperado correctamente",
        total_traces=len(traces),
        data=[
            ProvisioningWorkerCycleTraceResponse.model_validate(trace)
            for trace in traces
        ],
    )


@router.get("/metrics/alerts", response_model=ProvisioningOperationalAlertsResponse)
def provisioning_job_alerts(
    tenant_slug: str | None = None,
    worker_profile: str | None = None,
    db: Session = Depends(get_control_db),
    _token: dict = Depends(require_role("superadmin")),
) -> ProvisioningOperationalAlertsResponse:
    alerts = provisioning_alert_service.list_active_alerts(
        db,
        tenant_slug=tenant_slug,
        worker_profile=worker_profile,
    )
    return ProvisioningOperationalAlertsResponse(
        success=True,
        message="Alertas operativas de provisioning recuperadas correctamente",
        total_alerts=len(alerts),
        data=[ProvisioningOperationalAlertResponse(**item) for item in alerts],
    )


@router.get(
    "/metrics/alerts/history",
    response_model=ProvisioningOperationalAlertHistoryResponse,
)
def provisioning_job_alert_history(
    limit: int = 100,
    tenant_slug: str | None = None,
    worker_profile: str | None = None,
    alert_code: str | None = None,
    severity: str | None = None,
    db: Session = Depends(get_control_db),
    _token: dict = Depends(require_role("superadmin")),
) -> ProvisioningOperationalAlertHistoryResponse:
    alerts = provisioning_alert_service.list_recent_alert_history(
        db,
        limit=limit,
        tenant_slug=tenant_slug,
        worker_profile=worker_profile,
        alert_code=alert_code,
        severity=severity,
    )
    return ProvisioningOperationalAlertHistoryResponse(
        success=True,
        message="Historial de alertas operativas de provisioning recuperado correctamente",
        total_alerts=len(alerts),
        data=[
            ProvisioningOperationalAlertHistoryEntryResponse(**item)
            for item in alerts
        ],
    )


@router.post("/{job_id}/run", response_model=ProvisioningJobResponse)
def run_provisioning_job(
    job_id: int,
    db: Session = Depends(get_control_db),
    _token: dict = Depends(require_role("superadmin")),
) -> ProvisioningJobResponse:
    try:
        job = provisioning_service.run_job(db, job_id)
        return ProvisioningJobResponse.model_validate(job)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
