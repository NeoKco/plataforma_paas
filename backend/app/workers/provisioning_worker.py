from dataclasses import dataclass, field
from datetime import datetime, timezone
import time
from collections.abc import Callable
from uuid import uuid4

from app.apps.platform_control.services.provisioning_job_service import (
    ProvisioningJobService,
)
from app.apps.platform_control.services.provisioning_metrics_export_service import (
    ProvisioningMetricsExportService,
)
from app.apps.platform_control.services.provisioning_alert_service import (
    ProvisioningAlertService,
)
from app.apps.platform_control.services.provisioning_metrics_service import (
    ProvisioningMetricsService,
)
from app.apps.platform_control.services.provisioning_worker_cycle_trace_service import (
    ProvisioningWorkerCycleTraceService,
)
from app.apps.provisioning.services.provisioning_dispatch_service import (
    ProvisioningDispatchService,
)
from app.apps.provisioning.services.provisioning_service import ProvisioningService
from app.common.config.settings import settings
from app.common.db.control_database import ControlSessionLocal
from app.common.observability.logging_service import LoggingService


@dataclass
class ProvisioningWorkerCycleResult:
    worker_profile: str | None = None
    selection_strategy: str = "composite_score"
    capture_key: str | None = None
    job_types: list[str] = field(default_factory=list)
    priority_order: list[str] = field(default_factory=list)
    tenant_type_priority_order: list[str] = field(default_factory=list)
    job_type_limits: dict[str, int] = field(default_factory=dict)
    eligible_jobs: int = 0
    backlog_aging_threshold_minutes: int = 0
    aged_eligible_jobs: int = 0
    top_eligible_job_scores: list[dict] = field(default_factory=list)
    backlog_job_type_counts: dict[str, int] = field(default_factory=dict)
    tenant_type_limits: dict[str, int] = field(default_factory=dict)
    backlog_tenant_type_counts: dict[str, int] = field(default_factory=dict)
    queued_jobs: int = 0
    processed_job_ids: list[int] = field(default_factory=list)
    failed_job_ids: list[int] = field(default_factory=list)
    selected_job_type_counts: dict[str, int] = field(default_factory=dict)
    dynamic_job_type_limits_applied: dict[str, int] = field(default_factory=dict)
    selected_tenant_type_counts: dict[str, int] = field(default_factory=dict)
    dynamic_tenant_type_limits_applied: dict[str, int] = field(default_factory=dict)
    skipped_due_to_job_type_limits: int = 0
    skipped_due_to_tenant_type_limits: int = 0
    stopped_due_to_failure_limit: bool = False
    metrics_snapshot_count: int = 0
    metrics_exported_tenants: int = 0
    duration_seconds: float = 0.0

    def to_dict(self) -> dict:
        return {
            "worker_profile": self.worker_profile,
            "selection_strategy": self.selection_strategy,
            "capture_key": self.capture_key,
            "job_types": self.job_types,
            "priority_order": self.priority_order,
            "tenant_type_priority_order": self.tenant_type_priority_order,
            "job_type_limits": self.job_type_limits,
            "eligible_jobs": self.eligible_jobs,
            "backlog_aging_threshold_minutes": (
                self.backlog_aging_threshold_minutes
            ),
            "aged_eligible_jobs": self.aged_eligible_jobs,
            "top_eligible_job_scores": self.top_eligible_job_scores,
            "backlog_job_type_counts": self.backlog_job_type_counts,
            "tenant_type_limits": self.tenant_type_limits,
            "backlog_tenant_type_counts": self.backlog_tenant_type_counts,
            "queued_jobs": self.queued_jobs,
            "processed_job_ids": self.processed_job_ids,
            "failed_job_ids": self.failed_job_ids,
            "processed_count": len(self.processed_job_ids),
            "failed_count": len(self.failed_job_ids),
            "selected_job_type_counts": self.selected_job_type_counts,
            "dynamic_job_type_limits_applied": (
                self.dynamic_job_type_limits_applied
            ),
            "selected_tenant_type_counts": self.selected_tenant_type_counts,
            "dynamic_tenant_type_limits_applied": (
                self.dynamic_tenant_type_limits_applied
            ),
            "skipped_due_to_job_type_limits": self.skipped_due_to_job_type_limits,
            "skipped_due_to_tenant_type_limits": (
                self.skipped_due_to_tenant_type_limits
            ),
            "stopped_due_to_failure_limit": self.stopped_due_to_failure_limit,
            "metrics_snapshot_count": self.metrics_snapshot_count,
            "metrics_exported_tenants": self.metrics_exported_tenants,
            "duration_seconds": round(self.duration_seconds, 4),
        }


class ProvisioningWorker:
    def __init__(
        self,
        session_factory: Callable = ControlSessionLocal,
        provisioning_job_service: ProvisioningJobService | None = None,
        provisioning_dispatch_service: ProvisioningDispatchService | None = None,
        provisioning_metrics_service: ProvisioningMetricsService | None = None,
        provisioning_alert_service: ProvisioningAlertService | None = None,
        provisioning_worker_cycle_trace_service: (
            ProvisioningWorkerCycleTraceService | None
        ) = None,
        provisioning_metrics_export_service: ProvisioningMetricsExportService | None = None,
        provisioning_service: ProvisioningService | None = None,
        logging_service: LoggingService | None = None,
    ):
        self.session_factory = session_factory
        self.provisioning_job_service = (
            provisioning_job_service or ProvisioningJobService()
        )
        self.provisioning_dispatch_service = (
            provisioning_dispatch_service
            or ProvisioningDispatchService(
                provisioning_job_service=self.provisioning_job_service
            )
        )
        self.provisioning_metrics_service = (
            provisioning_metrics_service or ProvisioningMetricsService()
        )
        self.provisioning_alert_service = (
            provisioning_alert_service or ProvisioningAlertService()
        )
        self.provisioning_worker_cycle_trace_service = (
            provisioning_worker_cycle_trace_service
            or ProvisioningWorkerCycleTraceService()
        )
        self.provisioning_metrics_export_service = (
            provisioning_metrics_export_service or ProvisioningMetricsExportService()
        )
        self.provisioning_service = provisioning_service or ProvisioningService(
            provisioning_dispatch_service=self.provisioning_dispatch_service,
        )
        self.logging_service = logging_service or LoggingService(
            logger_name="platform_paas.ops"
        )

    def run_once(
        self,
        max_jobs: int | None = None,
        job_types: list[str] | None = None,
        worker_profile: str | None = None,
    ) -> list[int]:
        return self.run_once_with_metrics(
            max_jobs=max_jobs,
            job_types=job_types,
            worker_profile=worker_profile,
        ).processed_job_ids

    def run_once_with_metrics(
        self,
        max_jobs: int | None = None,
        max_failures: int | None = None,
        job_types: list[str] | None = None,
        worker_profile: str | None = None,
    ) -> ProvisioningWorkerCycleResult:
        limit = max_jobs or settings.WORKER_MAX_JOBS_PER_CYCLE
        failure_limit = max_failures or settings.WORKER_MAX_FAILURES_PER_CYCLE
        normalized_job_types = self._normalize_job_types(job_types)
        priority_order = self._resolve_priority_order(normalized_job_types)
        tenant_type_priority_order = self._resolve_tenant_type_priority_order()
        job_type_limits = self._resolve_job_type_limits(normalized_job_types)
        aging_threshold_minutes = max(
            settings.WORKER_BACKLOG_AGING_THRESHOLD_MINUTES,
            0,
        )
        cycle_capture_key = uuid4().hex
        fetch_limit = max(
            limit,
            limit * max(settings.WORKER_SELECTION_BUFFER_MULTIPLIER, 1),
        )
        cycle_started_at = time.monotonic()

        db = self.session_factory()
        try:
            eligible_jobs = self.provisioning_dispatch_service.list_pending_jobs(
                db,
                limit=fetch_limit,
                job_types=normalized_job_types,
                priority_order=priority_order,
            )
        finally:
            db.close()

        (
            eligible_jobs,
            aged_eligible_jobs,
            top_eligible_job_scores,
        ) = self._order_jobs_by_composite_score(
            eligible_jobs,
            priority_order=priority_order,
            tenant_type_priority_order=tenant_type_priority_order,
            aging_threshold_minutes=aging_threshold_minutes,
        )
        backlog_job_type_counts = self._count_job_types(eligible_jobs)
        effective_job_type_limits, dynamic_job_type_limits_applied = (
            self._apply_dynamic_backlog_limits(
                base_limits=job_type_limits,
                backlog_job_type_counts=backlog_job_type_counts,
                job_types=normalized_job_types,
            )
        )
        tenant_type_limits = self._resolve_tenant_type_limits()
        backlog_tenant_type_counts = self._count_tenant_types(eligible_jobs)
        effective_tenant_type_limits, dynamic_tenant_type_limits_applied = (
            self._apply_dynamic_tenant_type_limits(
                base_limits=tenant_type_limits,
                backlog_tenant_type_counts=backlog_tenant_type_counts,
            )
        )
        (
            selected_jobs,
            skipped_due_to_job_type_limits,
            skipped_due_to_tenant_type_limits,
            selected_job_type_counts,
            selected_tenant_type_counts,
        ) = self._apply_selection_limits(
                eligible_jobs,
                max_jobs=limit,
                job_type_limits=effective_job_type_limits,
                tenant_type_limits=effective_tenant_type_limits,
            )
        job_ids = [job.id for job in selected_jobs]

        result = ProvisioningWorkerCycleResult(
            worker_profile=worker_profile,
            capture_key=cycle_capture_key,
            job_types=normalized_job_types,
            priority_order=priority_order,
            tenant_type_priority_order=tenant_type_priority_order,
            job_type_limits=effective_job_type_limits,
            eligible_jobs=len(eligible_jobs),
            backlog_aging_threshold_minutes=aging_threshold_minutes,
            aged_eligible_jobs=aged_eligible_jobs,
            top_eligible_job_scores=top_eligible_job_scores,
            backlog_job_type_counts=backlog_job_type_counts,
            tenant_type_limits=effective_tenant_type_limits,
            backlog_tenant_type_counts=backlog_tenant_type_counts,
            queued_jobs=len(job_ids),
            selected_job_type_counts=selected_job_type_counts,
            dynamic_job_type_limits_applied=dynamic_job_type_limits_applied,
            selected_tenant_type_counts=selected_tenant_type_counts,
            dynamic_tenant_type_limits_applied=dynamic_tenant_type_limits_applied,
            skipped_due_to_job_type_limits=skipped_due_to_job_type_limits,
            skipped_due_to_tenant_type_limits=skipped_due_to_tenant_type_limits,
        )
        for job_id in job_ids:
            if len(result.failed_job_ids) >= failure_limit:
                result.stopped_due_to_failure_limit = True
                break

            db = self.session_factory()
            try:
                self.provisioning_service.run_job(db, job_id)
                result.processed_job_ids.append(job_id)
            except Exception:
                result.failed_job_ids.append(job_id)
                continue
            finally:
                db.close()

        result.duration_seconds = time.monotonic() - cycle_started_at
        snapshots = []
        saved_trace = None
        db = self.session_factory()
        try:
            try:
                snapshots = self._capture_metrics_snapshot(
                    db,
                    capture_key=cycle_capture_key,
                )
                result.metrics_snapshot_count = len(snapshots)
            except Exception as exc:
                self.logging_service.log_provisioning_metrics_snapshot_error(
                    error_type=type(exc).__name__,
                )

            try:
                result.metrics_exported_tenants = (
                    self.provisioning_metrics_export_service.export_current_summary(db)
                )
            except Exception as exc:
                self.logging_service.log_provisioning_metrics_export_error(
                    error_type=type(exc).__name__,
                )

            try:
                saved_trace = self.provisioning_worker_cycle_trace_service.save_cycle_trace(
                    db,
                    cycle_result=result,
                    capture_key=cycle_capture_key,
                )
            except Exception as exc:
                self.logging_service.log_provisioning_cycle_trace_error(
                    error_type=type(exc).__name__,
                )

            try:
                alerts = self.provisioning_alert_service.evaluate_records(
                    snapshots=snapshots,
                    traces=[saved_trace] if saved_trace is not None else [],
                )
                if alerts:
                    try:
                        self.provisioning_alert_service.save_alert_history(
                            db,
                            alerts=alerts,
                        )
                    except Exception as exc:
                        self.logging_service.log_provisioning_alert_persistence_error(
                            error_type=type(exc).__name__,
                        )
                if alerts:
                    self.logging_service.log_provisioning_alert_summary(
                        capture_key=cycle_capture_key,
                        total_alerts=len(alerts),
                        alert_codes=[
                            str(item["alert_code"])
                            for item in alerts
                        ],
                        severities=[
                            str(item["severity"])
                            for item in alerts
                        ],
                        tenant_slugs=sorted(
                            {
                                item["tenant_slug"]
                                for item in alerts
                                if item.get("tenant_slug")
                            }
                        ),
                        worker_profiles=sorted(
                            {
                                item["worker_profile"]
                                for item in alerts
                                if item.get("worker_profile")
                            }
                        ),
                    )
            except Exception:
                pass
        finally:
            db.close()

        self.logging_service.log_provisioning_worker_cycle(
            worker_profile=result.worker_profile,
            selection_strategy=result.selection_strategy,
            eligible_jobs=result.eligible_jobs,
            backlog_aging_threshold_minutes=(
                result.backlog_aging_threshold_minutes
            ),
            aged_eligible_jobs=result.aged_eligible_jobs,
            top_eligible_job_scores=result.top_eligible_job_scores,
            backlog_job_type_counts=result.backlog_job_type_counts,
            backlog_tenant_type_counts=result.backlog_tenant_type_counts,
            queued_jobs=result.queued_jobs,
            processed_job_ids=result.processed_job_ids,
            failed_job_ids=result.failed_job_ids,
            stopped_due_to_failure_limit=result.stopped_due_to_failure_limit,
            duration_ms=max(int(result.duration_seconds * 1000), 0),
            metrics_snapshot_count=result.metrics_snapshot_count,
            metrics_exported_tenants=result.metrics_exported_tenants,
            job_types=result.job_types,
            priority_order=result.priority_order,
            tenant_type_priority_order=result.tenant_type_priority_order,
            job_type_limits=result.job_type_limits,
            dynamic_job_type_limits_applied=(
                result.dynamic_job_type_limits_applied
            ),
            tenant_type_limits=result.tenant_type_limits,
            dynamic_tenant_type_limits_applied=(
                result.dynamic_tenant_type_limits_applied
            ),
            skipped_due_to_job_type_limits=result.skipped_due_to_job_type_limits,
            selected_job_type_counts=result.selected_job_type_counts,
            skipped_due_to_tenant_type_limits=(
                result.skipped_due_to_tenant_type_limits
            ),
            selected_tenant_type_counts=result.selected_tenant_type_counts,
        )
        return result

    def run_forever(
        self,
        max_jobs: int | None = None,
        poll_interval_seconds: int | None = None,
        max_failures: int | None = None,
        job_types: list[str] | None = None,
        worker_profile: str | None = None,
    ) -> None:
        limit = max_jobs or settings.WORKER_MAX_JOBS_PER_CYCLE
        interval = poll_interval_seconds or settings.WORKER_POLL_INTERVAL_SECONDS
        failure_limit = max_failures or settings.WORKER_MAX_FAILURES_PER_CYCLE
        normalized_job_types = self._normalize_job_types(job_types)

        while True:
            self.run_once_with_metrics(
                max_jobs=limit,
                max_failures=failure_limit,
                job_types=normalized_job_types,
                worker_profile=worker_profile,
            )
            time.sleep(interval)

    def _normalize_job_types(self, job_types: list[str] | None) -> list[str]:
        raw_values = job_types
        if raw_values is None:
            raw_values = [
                item.strip()
                for item in settings.WORKER_JOB_TYPES.split(",")
                if item.strip()
            ]

        normalized: list[str] = []
        seen: set[str] = set()
        for item in raw_values:
            value = item.strip()
            if not value or value in seen:
                continue
            seen.add(value)
            normalized.append(value)
        return normalized

    def _resolve_priority_order(self, job_types: list[str]) -> list[str]:
        priority_map = self._parse_job_type_priorities()
        if not priority_map:
            return job_types

        if job_types:
            indexed_job_types = {job_type: index for index, job_type in enumerate(job_types)}
            return sorted(
                job_types,
                key=lambda job_type: (
                    priority_map.get(job_type, 10_000),
                    indexed_job_types[job_type],
                ),
            )

        return sorted(priority_map, key=lambda job_type: priority_map[job_type])

    def _resolve_tenant_type_priority_order(self) -> list[str]:
        priority_map = self._parse_simple_limit_mapping(
            settings.WORKER_TENANT_TYPE_PRIORITIES,
        )
        if not priority_map:
            return []

        return sorted(priority_map, key=lambda tenant_type: priority_map[tenant_type])

    def _capture_metrics_snapshot(
        self,
        db,
        *,
        capture_key: str,
    ):
        try:
            return self.provisioning_metrics_service.capture_snapshot(
                db,
                capture_key=capture_key,
            )
        except TypeError:
            return self.provisioning_metrics_service.capture_snapshot(db)

    def _parse_job_type_priorities(self) -> dict[str, int]:
        priorities: dict[str, int] = {}
        raw_value = settings.WORKER_JOB_TYPE_PRIORITIES.strip()
        if not raw_value:
            return priorities

        for entry in raw_value.split(";"):
            item = entry.strip()
            if not item or "=" not in item:
                continue
            job_type, raw_priority = item.split("=", 1)
            job_type = job_type.strip()
            raw_priority = raw_priority.strip()
            if not job_type or not raw_priority:
                continue
            try:
                priorities[job_type] = int(raw_priority)
            except ValueError:
                continue

        return priorities

    def _resolve_job_type_limits(self, job_types: list[str]) -> dict[str, int]:
        limits = self._parse_job_type_limits()
        if not limits:
            return {}

        if not job_types:
            return limits

        return {
            job_type: limit
            for job_type, limit in limits.items()
            if job_type in job_types
        }

    def _apply_dynamic_backlog_limits(
        self,
        *,
        base_limits: dict[str, int],
        backlog_job_type_counts: dict[str, int],
        job_types: list[str],
    ) -> tuple[dict[str, int], dict[str, int]]:
        backlog_limits = self._parse_job_type_backlog_limits()
        if not backlog_limits:
            return dict(base_limits), {}

        effective_limits = dict(base_limits)
        applied_limits: dict[str, int] = {}
        candidate_job_types = job_types or list(backlog_job_type_counts.keys())

        for job_type in candidate_job_types:
            rule = backlog_limits.get(job_type)
            if not rule:
                continue

            backlog_count = backlog_job_type_counts.get(job_type, 0)
            if backlog_count < rule["threshold"]:
                continue

            current_limit = effective_limits.get(job_type)
            effective_limit = rule["limit"]
            if current_limit is not None:
                effective_limit = max(current_limit, effective_limit)

            effective_limits[job_type] = effective_limit
            applied_limits[job_type] = effective_limit

        return effective_limits, applied_limits

    def _parse_job_type_limits(self) -> dict[str, int]:
        limits: dict[str, int] = {}
        raw_value = settings.WORKER_JOB_TYPE_LIMITS.strip()
        if not raw_value:
            return limits

        for entry in raw_value.split(";"):
            item = entry.strip()
            if not item or "=" not in item:
                continue
            job_type, raw_limit = item.split("=", 1)
            job_type = job_type.strip()
            raw_limit = raw_limit.strip()
            if not job_type or not raw_limit:
                continue
            try:
                parsed_limit = int(raw_limit)
            except ValueError:
                continue
            if parsed_limit < 0:
                continue
            limits[job_type] = parsed_limit

        return limits

    def _parse_job_type_backlog_limits(self) -> dict[str, dict[str, int]]:
        backlog_limits: dict[str, dict[str, int]] = {}
        raw_value = settings.WORKER_JOB_TYPE_BACKLOG_LIMITS.strip()
        if not raw_value:
            return backlog_limits

        for entry in raw_value.split(";"):
            item = entry.strip()
            if not item or "=" not in item:
                continue

            job_type, raw_rule = item.split("=", 1)
            job_type = job_type.strip()
            raw_rule = raw_rule.strip()
            if not job_type or not raw_rule or ":" not in raw_rule:
                continue

            raw_threshold, raw_limit = raw_rule.split(":", 1)
            raw_threshold = raw_threshold.strip()
            raw_limit = raw_limit.strip()
            if not raw_threshold or not raw_limit:
                continue

            try:
                threshold = int(raw_threshold)
                limit = int(raw_limit)
            except ValueError:
                continue

            if threshold < 0 or limit < 0:
                continue

            backlog_limits[job_type] = {
                "threshold": threshold,
                "limit": limit,
            }

        return backlog_limits

    def _resolve_tenant_type_limits(self) -> dict[str, int]:
        return self._parse_simple_limit_mapping(settings.WORKER_TENANT_TYPE_LIMITS)

    def _apply_dynamic_tenant_type_limits(
        self,
        *,
        base_limits: dict[str, int],
        backlog_tenant_type_counts: dict[str, int],
    ) -> tuple[dict[str, int], dict[str, int]]:
        backlog_limits = self._parse_backlog_limit_mapping(
            settings.WORKER_TENANT_TYPE_BACKLOG_LIMITS,
        )
        if not backlog_limits:
            return dict(base_limits), {}

        effective_limits = dict(base_limits)
        applied_limits: dict[str, int] = {}

        for tenant_type, rule in backlog_limits.items():
            backlog_count = backlog_tenant_type_counts.get(tenant_type, 0)
            if backlog_count < rule["threshold"]:
                continue

            current_limit = effective_limits.get(tenant_type)
            effective_limit = rule["limit"]
            if current_limit is not None:
                effective_limit = max(current_limit, effective_limit)

            effective_limits[tenant_type] = effective_limit
            applied_limits[tenant_type] = effective_limit

        return effective_limits, applied_limits

    def _parse_simple_limit_mapping(self, raw_value: str) -> dict[str, int]:
        limits: dict[str, int] = {}
        if not raw_value.strip():
            return limits

        for entry in raw_value.split(";"):
            item = entry.strip()
            if not item or "=" not in item:
                continue
            key, raw_limit = item.split("=", 1)
            key = key.strip()
            raw_limit = raw_limit.strip()
            if not key or not raw_limit:
                continue
            try:
                parsed_limit = int(raw_limit)
            except ValueError:
                continue
            if parsed_limit < 0:
                continue
            limits[key] = parsed_limit

        return limits

    def _parse_backlog_limit_mapping(self, raw_value: str) -> dict[str, dict[str, int]]:
        backlog_limits: dict[str, dict[str, int]] = {}
        if not raw_value.strip():
            return backlog_limits

        for entry in raw_value.split(";"):
            item = entry.strip()
            if not item or "=" not in item:
                continue

            key, raw_rule = item.split("=", 1)
            key = key.strip()
            raw_rule = raw_rule.strip()
            if not key or not raw_rule or ":" not in raw_rule:
                continue

            raw_threshold, raw_limit = raw_rule.split(":", 1)
            raw_threshold = raw_threshold.strip()
            raw_limit = raw_limit.strip()
            if not raw_threshold or not raw_limit:
                continue

            try:
                threshold = int(raw_threshold)
                limit = int(raw_limit)
            except ValueError:
                continue

            if threshold < 0 or limit < 0:
                continue

            backlog_limits[key] = {
                "threshold": threshold,
                "limit": limit,
            }

        return backlog_limits

    def _apply_selection_limits(
        self,
        jobs: list,
        *,
        max_jobs: int,
        job_type_limits: dict[str, int],
        tenant_type_limits: dict[str, int],
    ) -> tuple[list, int, int, dict[str, int], dict[str, int]]:
        if not job_type_limits and not tenant_type_limits:
            selected_jobs = jobs[:max_jobs]
            return (
                selected_jobs,
                0,
                0,
                self._count_job_types(selected_jobs),
                self._count_tenant_types(selected_jobs),
            )

        selected_jobs: list = []
        selected_job_type_counts: dict[str, int] = {}
        selected_tenant_type_counts: dict[str, int] = {}
        skipped_due_to_job_type_limits = 0
        skipped_due_to_tenant_type_limits = 0

        for job in jobs:
            if len(selected_jobs) >= max_jobs:
                break

            job_type = getattr(job, "job_type", "")
            job_type_limit = job_type_limits.get(job_type)
            current_job_type_count = selected_job_type_counts.get(job_type, 0)

            if (
                job_type_limit is not None
                and current_job_type_count >= job_type_limit
            ):
                skipped_due_to_job_type_limits += 1
                continue

            tenant_type = self._get_job_tenant_type(job)
            tenant_type_limit = tenant_type_limits.get(tenant_type)
            current_tenant_type_count = selected_tenant_type_counts.get(tenant_type, 0)

            if (
                tenant_type_limit is not None
                and current_tenant_type_count >= tenant_type_limit
            ):
                skipped_due_to_tenant_type_limits += 1
                continue

            selected_jobs.append(job)
            selected_job_type_counts[job_type] = current_job_type_count + 1
            selected_tenant_type_counts[tenant_type] = current_tenant_type_count + 1

        return (
            selected_jobs,
            skipped_due_to_job_type_limits,
            skipped_due_to_tenant_type_limits,
            selected_job_type_counts,
            selected_tenant_type_counts,
        )

    def _order_jobs_by_composite_score(
        self,
        jobs: list,
        *,
        priority_order: list[str],
        tenant_type_priority_order: list[str],
        aging_threshold_minutes: int,
    ) -> tuple[list, int, list[dict]]:
        now = datetime.now(timezone.utc)
        scored_jobs: list[tuple[object, dict]] = []

        for job in jobs:
            score = self._build_job_composite_score(
                job,
                now=now,
                priority_order=priority_order,
                tenant_type_priority_order=tenant_type_priority_order,
                aging_threshold_minutes=aging_threshold_minutes,
            )
            scored_jobs.append((job, score))

        scored_jobs.sort(
            key=lambda item: (
                -item[1]["total_score"],
                getattr(item[0], "id", 0),
            ),
        )

        ordered_jobs = [job for job, _ in scored_jobs]
        aged_jobs_count = sum(1 for _, score in scored_jobs if score["aged"])
        top_scores = [score for _, score in scored_jobs[:5]]
        return ordered_jobs, aged_jobs_count, top_scores

    def _build_job_composite_score(
        self,
        job,
        *,
        now: datetime,
        priority_order: list[str],
        tenant_type_priority_order: list[str],
        aging_threshold_minutes: int,
    ) -> dict:
        job_id = getattr(job, "id", 0)
        job_type = getattr(job, "job_type", "")
        tenant_type = self._get_job_tenant_type(job)
        aged = self._is_aged_job(job, now, aging_threshold_minutes)
        waiting_minutes = self._get_job_waiting_minutes(job, now)

        job_type_rank = self._resolve_priority_rank(job_type, priority_order)
        tenant_type_rank = self._resolve_priority_rank(
            tenant_type,
            tenant_type_priority_order,
        )

        aged_component = 1_000_000 if aged else 0
        tenant_component = self._priority_rank_to_component(
            tenant_type_rank,
            scale=1_000,
        )
        job_type_component = self._priority_rank_to_component(
            job_type_rank,
            scale=100,
        )
        waiting_component = min(waiting_minutes, 9_999)
        total_score = (
            aged_component
            + tenant_component
            + job_type_component
            + waiting_component
        )

        return {
            "job_id": job_id,
            "job_type": job_type,
            "tenant_type": tenant_type,
            "aged": aged,
            "waiting_minutes": waiting_minutes,
            "job_type_priority_rank": job_type_rank,
            "tenant_type_priority_rank": tenant_type_rank,
            "aged_component": aged_component,
            "tenant_type_component": tenant_component,
            "job_type_component": job_type_component,
            "waiting_component": waiting_component,
            "total_score": total_score,
        }

    def _resolve_priority_rank(
        self,
        value: str,
        priority_order: list[str],
    ) -> int | None:
        if not priority_order:
            return None

        try:
            return priority_order.index(value)
        except ValueError:
            return None

    def _priority_rank_to_component(
        self,
        rank: int | None,
        *,
        scale: int,
    ) -> int:
        if rank is None:
            return 0
        return max(0, 100 - rank) * scale

    def _is_aged_job(
        self,
        job,
        now: datetime,
        aging_threshold_minutes: int,
    ) -> bool:
        waiting_since = self._get_job_waiting_since(job)
        if waiting_since is None:
            return False

        if waiting_since.tzinfo is None:
            waiting_since = waiting_since.replace(tzinfo=timezone.utc)

        age_seconds = (now - waiting_since).total_seconds()
        return age_seconds >= aging_threshold_minutes * 60

    def _get_job_waiting_since(self, job) -> datetime | None:
        created_at = getattr(job, "created_at", None)
        if created_at is not None:
            return created_at
        return getattr(job, "last_attempt_at", None)

    def _get_job_waiting_minutes(
        self,
        job,
        now: datetime,
    ) -> int:
        waiting_since = self._get_job_waiting_since(job)
        if waiting_since is None:
            return 0

        if waiting_since.tzinfo is None:
            waiting_since = waiting_since.replace(tzinfo=timezone.utc)

        waiting_seconds = max((now - waiting_since).total_seconds(), 0)
        return int(waiting_seconds // 60)

    def _count_job_types(self, jobs: list) -> dict[str, int]:
        counts: dict[str, int] = {}
        for job in jobs:
            job_type = getattr(job, "job_type", "")
            counts[job_type] = counts.get(job_type, 0) + 1
        return counts

    def _count_tenant_types(self, jobs: list) -> dict[str, int]:
        counts: dict[str, int] = {}
        for job in jobs:
            tenant_type = self._get_job_tenant_type(job)
            counts[tenant_type] = counts.get(tenant_type, 0) + 1
        return counts

    def _get_job_tenant_type(self, job) -> str:
        tenant = getattr(job, "tenant", None)
        if tenant is not None:
            return getattr(tenant, "tenant_type", "")
        return getattr(job, "tenant_type", "")
