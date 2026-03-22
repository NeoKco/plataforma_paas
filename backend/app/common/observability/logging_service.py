import json
import logging
from datetime import datetime


class LoggingService:
    def __init__(self, logger_name: str = "platform_paas.request"):
        self.logger = logging.getLogger(logger_name)

    def log_request_summary(
        self,
        *,
        request_id: str,
        method: str,
        path: str,
        status_code: int,
        duration_ms: int,
        token_scope: str | None = None,
        platform_user_id: int | None = None,
        tenant_user_id: int | None = None,
        tenant_slug: str | None = None,
    ) -> None:
        payload = {
            "event": "http_request",
            "request_id": request_id,
            "method": method,
            "path": path,
            "status_code": status_code,
            "duration_ms": duration_ms,
            "token_scope": token_scope,
            "platform_user_id": platform_user_id,
            "tenant_user_id": tenant_user_id,
            "tenant_slug": tenant_slug,
        }
        self.logger.info(json.dumps(payload, sort_keys=True))

    def log_request_exception(
        self,
        *,
        request_id: str,
        method: str,
        path: str,
        error_type: str,
    ) -> None:
        payload = {
            "event": "http_request_error",
            "request_id": request_id,
            "method": method,
            "path": path,
            "error_type": error_type,
        }
        self.logger.exception(json.dumps(payload, sort_keys=True))

    def log_provisioning_job_result(
        self,
        *,
        job_id: int,
        tenant_id: int,
        tenant_slug: str,
        status: str,
        attempts: int,
        max_attempts: int,
        duration_ms: int,
        next_retry_at: datetime | None = None,
        error_message: str | None = None,
    ) -> None:
        payload = {
            "event": "provisioning_job",
            "job_id": job_id,
            "tenant_id": tenant_id,
            "tenant_slug": tenant_slug,
            "status": status,
            "attempts": attempts,
            "max_attempts": max_attempts,
            "duration_ms": duration_ms,
            "next_retry_at": (
                next_retry_at.isoformat() if next_retry_at is not None else None
            ),
            "error_message": error_message,
        }
        self.logger.info(json.dumps(payload, sort_keys=True))

    def log_provisioning_worker_cycle(
        self,
        *,
        worker_profile: str | None = None,
        selection_strategy: str = "composite_score",
        eligible_jobs: int = 0,
        backlog_aging_threshold_minutes: int = 0,
        aged_eligible_jobs: int = 0,
        top_eligible_job_scores: list[dict] | None = None,
        backlog_job_type_counts: dict[str, int] | None = None,
        backlog_tenant_type_counts: dict[str, int] | None = None,
        queued_jobs: int,
        processed_job_ids: list[int],
        failed_job_ids: list[int],
        stopped_due_to_failure_limit: bool,
        duration_ms: int,
        metrics_snapshot_count: int = 0,
        metrics_exported_tenants: int = 0,
        job_types: list[str] | None = None,
        priority_order: list[str] | None = None,
        tenant_type_priority_order: list[str] | None = None,
        job_type_limits: dict[str, int] | None = None,
        dynamic_job_type_limits_applied: dict[str, int] | None = None,
        tenant_type_limits: dict[str, int] | None = None,
        dynamic_tenant_type_limits_applied: dict[str, int] | None = None,
        skipped_due_to_job_type_limits: int = 0,
        selected_job_type_counts: dict[str, int] | None = None,
        skipped_due_to_tenant_type_limits: int = 0,
        selected_tenant_type_counts: dict[str, int] | None = None,
    ) -> None:
        payload = {
            "event": "provisioning_worker_cycle",
            "worker_profile": worker_profile,
            "selection_strategy": selection_strategy,
            "eligible_jobs": eligible_jobs,
            "backlog_aging_threshold_minutes": backlog_aging_threshold_minutes,
            "aged_eligible_jobs": aged_eligible_jobs,
            "top_eligible_job_scores": top_eligible_job_scores or [],
            "backlog_job_type_counts": backlog_job_type_counts or {},
            "backlog_tenant_type_counts": backlog_tenant_type_counts or {},
            "queued_jobs": queued_jobs,
            "processed_job_ids": processed_job_ids,
            "failed_job_ids": failed_job_ids,
            "processed_count": len(processed_job_ids),
            "failed_count": len(failed_job_ids),
            "stopped_due_to_failure_limit": stopped_due_to_failure_limit,
            "duration_ms": duration_ms,
            "metrics_snapshot_count": metrics_snapshot_count,
            "metrics_exported_tenants": metrics_exported_tenants,
            "job_types": job_types or [],
            "priority_order": priority_order or [],
            "tenant_type_priority_order": tenant_type_priority_order or [],
            "job_type_limits": job_type_limits or {},
            "dynamic_job_type_limits_applied": (
                dynamic_job_type_limits_applied or {}
            ),
            "tenant_type_limits": tenant_type_limits or {},
            "dynamic_tenant_type_limits_applied": (
                dynamic_tenant_type_limits_applied or {}
            ),
            "skipped_due_to_job_type_limits": skipped_due_to_job_type_limits,
            "selected_job_type_counts": selected_job_type_counts or {},
            "skipped_due_to_tenant_type_limits": skipped_due_to_tenant_type_limits,
            "selected_tenant_type_counts": selected_tenant_type_counts or {},
        }
        self.logger.info(json.dumps(payload, sort_keys=True))

    def log_provisioning_metrics_snapshot_error(
        self,
        *,
        error_type: str,
    ) -> None:
        payload = {
            "event": "provisioning_metrics_snapshot_error",
            "error_type": error_type,
        }
        self.logger.exception(json.dumps(payload, sort_keys=True))

    def log_provisioning_metrics_export_error(
        self,
        *,
        error_type: str,
    ) -> None:
        payload = {
            "event": "provisioning_metrics_export_error",
            "error_type": error_type,
        }
        self.logger.exception(json.dumps(payload, sort_keys=True))

    def log_provisioning_cycle_trace_error(
        self,
        *,
        error_type: str,
    ) -> None:
        payload = {
            "event": "provisioning_cycle_trace_error",
            "error_type": error_type,
        }
        self.logger.exception(json.dumps(payload, sort_keys=True))

    def log_provisioning_alert_summary(
        self,
        *,
        capture_key: str | None,
        total_alerts: int,
        alert_codes: list[str],
        severities: list[str],
        tenant_slugs: list[str] | None = None,
        worker_profiles: list[str] | None = None,
    ) -> None:
        payload = {
            "event": "provisioning_alert_summary",
            "capture_key": capture_key,
            "total_alerts": total_alerts,
            "alert_codes": alert_codes,
            "severities": severities,
            "tenant_slugs": tenant_slugs or [],
            "worker_profiles": worker_profiles or [],
        }
        self.logger.warning(json.dumps(payload, sort_keys=True))

    def log_provisioning_alert_persistence_error(
        self,
        *,
        error_type: str,
    ) -> None:
        payload = {
            "event": "provisioning_alert_persistence_error",
            "error_type": error_type,
        }
        self.logger.exception(json.dumps(payload, sort_keys=True))

    def log_provisioning_broker_dlq_event(
        self,
        *,
        action: str,
        job_id: int,
        job_type: str,
        tenant_id: int | None = None,
        tenant_slug: str | None = None,
        detail: str | None = None,
    ) -> None:
        payload = {
            "event": "provisioning_broker_dlq",
            "action": action,
            "job_id": job_id,
            "job_type": job_type,
            "tenant_id": tenant_id,
            "tenant_slug": tenant_slug,
            "detail": detail,
        }
        self.logger.info(json.dumps(payload, sort_keys=True))
