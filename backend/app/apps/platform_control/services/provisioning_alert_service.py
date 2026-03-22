import json
from datetime import datetime
from typing import Any

from sqlalchemy.orm import Session

from app.apps.platform_control.models.provisioning_job_metric_snapshot import (
    ProvisioningJobMetricSnapshot,
)
from app.apps.platform_control.models.provisioning_worker_cycle_trace import (
    ProvisioningWorkerCycleTrace,
)
from app.apps.platform_control.models.provisioning_operational_alert import (
    ProvisioningOperationalAlert,
)
from app.apps.platform_control.repositories.provisioning_operational_alert_repository import (
    ProvisioningOperationalAlertRepository,
)
from app.apps.platform_control.services.provisioning_job_service import (
    ProvisioningJobService,
)
from app.apps.platform_control.services.provisioning_metrics_service import (
    ProvisioningMetricsService,
)
from app.apps.platform_control.services.provisioning_worker_cycle_trace_service import (
    ProvisioningWorkerCycleTraceService,
)
from app.common.config.settings import settings


class ProvisioningAlertService:
    def __init__(
        self,
        provisioning_metrics_service: ProvisioningMetricsService | None = None,
        provisioning_job_service: ProvisioningJobService | None = None,
        provisioning_worker_cycle_trace_service: (
            ProvisioningWorkerCycleTraceService | None
        ) = None,
        provisioning_operational_alert_repository: (
            ProvisioningOperationalAlertRepository | None
        ) = None,
    ):
        self.provisioning_metrics_service = (
            provisioning_metrics_service or ProvisioningMetricsService()
        )
        self.provisioning_job_service = (
            provisioning_job_service or ProvisioningJobService()
        )
        self.provisioning_worker_cycle_trace_service = (
            provisioning_worker_cycle_trace_service
            or ProvisioningWorkerCycleTraceService()
        )
        self.provisioning_operational_alert_repository = (
            provisioning_operational_alert_repository
            or ProvisioningOperationalAlertRepository()
        )

    def list_active_alerts(
        self,
        db: Session,
        *,
        tenant_slug: str | None = None,
        worker_profile: str | None = None,
        snapshot_limit: int = 200,
        trace_limit: int = 100,
    ) -> list[dict[str, Any]]:
        snapshots = self.provisioning_metrics_service.list_recent_snapshots(
            db,
            limit=snapshot_limit,
            tenant_slug=tenant_slug,
        )
        traces = self.provisioning_worker_cycle_trace_service.list_recent_traces(
            db,
            limit=trace_limit,
            worker_profile=worker_profile,
        )
        selected_snapshots = self._select_latest_snapshots(
            snapshots,
            tenant_slug=tenant_slug,
        )
        alerts = self.evaluate_records(
            snapshots=selected_snapshots,
            traces=self._select_latest_traces(traces, worker_profile=worker_profile),
        )
        alerts.extend(
            self._build_failed_error_code_alerts_for_snapshots(
                db,
                snapshots=selected_snapshots,
            )
        )
        return self._sort_alerts(alerts)

    def evaluate_records(
        self,
        *,
        snapshots: list[ProvisioningJobMetricSnapshot] | None = None,
        traces: list[ProvisioningWorkerCycleTrace] | None = None,
    ) -> list[dict[str, Any]]:
        alerts: list[dict[str, Any]] = []

        for snapshot in snapshots or []:
            alerts.extend(self._build_snapshot_alerts(snapshot))

        for trace in traces or []:
            alerts.extend(self._build_trace_alerts(trace))

        return self._sort_alerts(alerts)

    def save_alert_history(
        self,
        db: Session,
        *,
        alerts: list[dict[str, Any]],
    ) -> list[ProvisioningOperationalAlert]:
        rows = [
            {
                "alert_code": str(item["alert_code"]),
                "severity": str(item["severity"]),
                "source_type": str(item["source_type"]),
                "error_code": item.get("error_code"),
                "tenant_slug": item.get("tenant_slug"),
                "worker_profile": item.get("worker_profile"),
                "capture_key": str(item["capture_key"]),
                "message": str(item["message"]),
                "observed_value_json": json.dumps(item.get("observed_value")),
                "threshold_value_json": json.dumps(item.get("threshold_value")),
                "source_captured_at": item["captured_at"],
            }
            for item in alerts
        ]
        return self.provisioning_operational_alert_repository.save_many(
            db,
            rows=rows,
        )

    def list_recent_alert_history(
        self,
        db: Session,
        *,
        limit: int = 100,
        tenant_slug: str | None = None,
        worker_profile: str | None = None,
        alert_code: str | None = None,
        severity: str | None = None,
    ) -> list[dict[str, Any]]:
        alerts = self.provisioning_operational_alert_repository.list_recent(
            db,
            limit=limit,
            tenant_slug=tenant_slug,
            worker_profile=worker_profile,
            alert_code=alert_code,
            severity=severity,
        )
        return [self.serialize_history_entry(item) for item in alerts]

    def serialize_history_entry(
        self,
        alert: ProvisioningOperationalAlert,
    ) -> dict[str, Any]:
        return {
            "id": alert.id,
            "alert_code": alert.alert_code,
            "severity": alert.severity,
            "source_type": alert.source_type,
            "error_code": getattr(alert, "error_code", None),
            "tenant_slug": alert.tenant_slug,
            "worker_profile": alert.worker_profile,
            "capture_key": alert.capture_key,
            "message": alert.message,
            "observed_value": json.loads(alert.observed_value_json),
            "threshold_value": (
                json.loads(alert.threshold_value_json)
                if alert.threshold_value_json is not None
                else None
            ),
            "source_captured_at": alert.source_captured_at,
            "recorded_at": alert.recorded_at,
        }

    def _select_latest_snapshots(
        self,
        snapshots: list[ProvisioningJobMetricSnapshot],
        *,
        tenant_slug: str | None = None,
    ) -> list[ProvisioningJobMetricSnapshot]:
        if tenant_slug:
            return snapshots[:1]

        selected: list[ProvisioningJobMetricSnapshot] = []
        seen: set[str] = set()
        for snapshot in snapshots:
            if snapshot.tenant_slug in seen:
                continue
            seen.add(snapshot.tenant_slug)
            selected.append(snapshot)
        return selected

    def _select_latest_traces(
        self,
        traces: list[ProvisioningWorkerCycleTrace],
        *,
        worker_profile: str | None = None,
    ) -> list[ProvisioningWorkerCycleTrace]:
        if worker_profile:
            return traces[:1]

        selected: list[ProvisioningWorkerCycleTrace] = []
        seen: set[str] = set()
        for trace in traces:
            profile_key = trace.worker_profile or "__default__"
            if profile_key in seen:
                continue
            seen.add(profile_key)
            selected.append(trace)
        return selected

    def _build_snapshot_alerts(
        self,
        snapshot: ProvisioningJobMetricSnapshot,
    ) -> list[dict[str, Any]]:
        alerts: list[dict[str, Any]] = []
        alerts.extend(
            self._build_threshold_alert(
                observed_value=snapshot.pending_jobs,
                threshold_value=settings.PROVISIONING_ALERT_PENDING_JOBS_THRESHOLD,
                alert_code="tenant_pending_jobs_threshold_exceeded",
                severity="warning",
                source_type="tenant_snapshot",
                tenant_slug=snapshot.tenant_slug,
                capture_key=snapshot.capture_key,
                captured_at=snapshot.captured_at,
                message=(
                    f"Tenant {snapshot.tenant_slug} supera el umbral de jobs "
                    "pending de provisioning"
                ),
            )
        )
        alerts.extend(
            self._build_threshold_alert(
                observed_value=snapshot.retry_pending_jobs,
                threshold_value=(
                    settings.PROVISIONING_ALERT_RETRY_PENDING_JOBS_THRESHOLD
                ),
                alert_code="tenant_retry_pending_jobs_threshold_exceeded",
                severity="warning",
                source_type="tenant_snapshot",
                tenant_slug=snapshot.tenant_slug,
                capture_key=snapshot.capture_key,
                captured_at=snapshot.captured_at,
                message=(
                    f"Tenant {snapshot.tenant_slug} supera el umbral de jobs "
                    "retry_pending de provisioning"
                ),
            )
        )
        alerts.extend(
            self._build_threshold_alert(
                observed_value=snapshot.failed_jobs,
                threshold_value=settings.PROVISIONING_ALERT_FAILED_JOBS_THRESHOLD,
                alert_code="tenant_failed_jobs_threshold_exceeded",
                severity="error",
                source_type="tenant_snapshot",
                tenant_slug=snapshot.tenant_slug,
                capture_key=snapshot.capture_key,
                captured_at=snapshot.captured_at,
                message=(
                    f"Tenant {snapshot.tenant_slug} supera el umbral de jobs "
                    "failed de provisioning"
                ),
            )
        )
        alerts.extend(
            self._build_threshold_alert(
                observed_value=snapshot.max_attempts_seen,
                threshold_value=(
                    settings.PROVISIONING_ALERT_MAX_ATTEMPTS_SEEN_THRESHOLD
                ),
                alert_code="tenant_max_attempts_seen_threshold_exceeded",
                severity="warning",
                source_type="tenant_snapshot",
                tenant_slug=snapshot.tenant_slug,
                capture_key=snapshot.capture_key,
                captured_at=snapshot.captured_at,
                message=(
                    f"Tenant {snapshot.tenant_slug} supera el umbral de "
                    "max_attempts observados en provisioning"
                ),
            )
        )
        return alerts

    def _build_failed_error_code_alerts_for_snapshots(
        self,
        db: Session,
        *,
        snapshots: list[ProvisioningJobMetricSnapshot],
    ) -> list[dict[str, Any]]:
        threshold = settings.PROVISIONING_ALERT_FAILED_ERROR_CODE_THRESHOLD
        scan_limit = max(settings.PROVISIONING_ALERT_FAILED_ERROR_CODE_SCAN_LIMIT, 1)
        if threshold <= 0:
            return []

        alerts: list[dict[str, Any]] = []
        for snapshot in snapshots:
            failed_jobs = self.provisioning_job_service.list_recent_failed_jobs(
                db,
                limit=scan_limit,
                tenant_slug=snapshot.tenant_slug,
            )
            counts: dict[str, int] = {}
            for job in failed_jobs:
                error_code = (getattr(job, "error_code", None) or "").strip()
                if not error_code:
                    continue
                counts[error_code] = counts.get(error_code, 0) + 1

            for error_code, count in sorted(counts.items()):
                if count < threshold:
                    continue
                alerts.append(
                    {
                        "alert_code": "tenant_failed_error_code_threshold_exceeded",
                        "severity": "error",
                        "source_type": "tenant_failed_jobs",
                        "error_code": error_code,
                        "tenant_slug": snapshot.tenant_slug,
                        "worker_profile": None,
                        "capture_key": snapshot.capture_key,
                        "message": (
                            f"Tenant {snapshot.tenant_slug} acumula jobs failed "
                            f"recientes con error_code {error_code}"
                        ),
                        "observed_value": count,
                        "threshold_value": threshold,
                        "captured_at": snapshot.captured_at,
                    }
                )
        return alerts

    def _build_trace_alerts(
        self,
        trace: ProvisioningWorkerCycleTrace,
    ) -> list[dict[str, Any]]:
        alerts: list[dict[str, Any]] = []
        alerts.extend(
            self._build_threshold_alert(
                observed_value=trace.failed_count,
                threshold_value=settings.PROVISIONING_ALERT_CYCLE_FAILED_COUNT_THRESHOLD,
                alert_code="worker_cycle_failed_count_threshold_exceeded",
                severity="error",
                source_type="worker_cycle_trace",
                worker_profile=trace.worker_profile,
                capture_key=trace.capture_key,
                captured_at=trace.captured_at,
                message=(
                    "El ciclo del worker supera el umbral de jobs fallidos en la corrida"
                ),
            )
        )
        alerts.extend(
            self._build_threshold_alert(
                observed_value=trace.duration_ms,
                threshold_value=settings.PROVISIONING_ALERT_CYCLE_DURATION_MS_THRESHOLD,
                alert_code="worker_cycle_duration_threshold_exceeded",
                severity="warning",
                source_type="worker_cycle_trace",
                worker_profile=trace.worker_profile,
                capture_key=trace.capture_key,
                captured_at=trace.captured_at,
                message="El ciclo del worker supera el umbral de duracion configurado",
            )
        )
        alerts.extend(
            self._build_threshold_alert(
                observed_value=trace.aged_eligible_jobs,
                threshold_value=settings.PROVISIONING_ALERT_CYCLE_AGED_JOBS_THRESHOLD,
                alert_code="worker_cycle_aged_jobs_threshold_exceeded",
                severity="warning",
                source_type="worker_cycle_trace",
                worker_profile=trace.worker_profile,
                capture_key=trace.capture_key,
                captured_at=trace.captured_at,
                message=(
                    "El ciclo del worker acumula demasiados jobs envejecidos en la "
                    "ventana elegible"
                ),
            )
        )
        if trace.stopped_due_to_failure_limit:
            alerts.append(
                self._build_alert(
                    alert_code="worker_cycle_stopped_due_to_failure_limit",
                    severity="critical",
                    source_type="worker_cycle_trace",
                    message=(
                        "El worker corto el ciclo por alcanzar el limite de fallos"
                    ),
                    observed_value=True,
                    threshold_value=True,
                    captured_at=trace.captured_at,
                    capture_key=trace.capture_key,
                    worker_profile=trace.worker_profile,
                )
            )
        return alerts

    def _build_threshold_alert(
        self,
        *,
        observed_value: int,
        threshold_value: int,
        alert_code: str,
        severity: str,
        source_type: str,
        message: str,
        captured_at: datetime,
        capture_key: str,
        tenant_slug: str | None = None,
        worker_profile: str | None = None,
    ) -> list[dict[str, Any]]:
        if threshold_value <= 0:
            return []
        if observed_value < threshold_value:
            return []
        return [
            self._build_alert(
                alert_code=alert_code,
                severity=severity,
                source_type=source_type,
                message=message,
                observed_value=observed_value,
                threshold_value=threshold_value,
                captured_at=captured_at,
                capture_key=capture_key,
                tenant_slug=tenant_slug,
                worker_profile=worker_profile,
            )
        ]

    def _build_alert(
        self,
        *,
        alert_code: str,
        severity: str,
        source_type: str,
        message: str,
        observed_value: Any,
        threshold_value: Any,
        captured_at: datetime,
        capture_key: str,
        tenant_slug: str | None = None,
        worker_profile: str | None = None,
    ) -> dict[str, Any]:
        return {
            "alert_code": alert_code,
            "severity": severity,
            "source_type": source_type,
            "tenant_slug": tenant_slug,
            "worker_profile": worker_profile,
            "capture_key": capture_key,
            "message": message,
            "observed_value": observed_value,
            "threshold_value": threshold_value,
            "captured_at": captured_at,
        }

    def _sort_alerts(
        self,
        alerts: list[dict[str, Any]],
    ) -> list[dict[str, Any]]:
        severity_rank = {"critical": 0, "error": 1, "warning": 2}
        return sorted(
            alerts,
            key=lambda item: (
                severity_rank.get(item["severity"], 99),
                -(item["captured_at"].timestamp()),
                item["alert_code"],
            ),
        )
