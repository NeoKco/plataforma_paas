from pathlib import Path

from sqlalchemy.orm import Session

from app.apps.platform_control.services.billing_alert_service import (
    BillingAlertService,
)
from app.apps.platform_control.services.provisioning_alert_service import (
    ProvisioningAlertService,
)
from app.apps.platform_control.services.provisioning_job_service import (
    ProvisioningJobService,
)
from app.apps.platform_control.services.tenant_billing_sync_service import (
    TenantBillingSyncService,
)
from app.common.config.settings import settings


class ProvisioningMetricsExportService:
    def __init__(
        self,
        provisioning_job_service: ProvisioningJobService | None = None,
        provisioning_alert_service: ProvisioningAlertService | None = None,
        tenant_billing_sync_service: TenantBillingSyncService | None = None,
        billing_alert_service: BillingAlertService | None = None,
        *,
        enabled: bool | None = None,
        output_path: str | None = None,
    ):
        self.provisioning_job_service = (
            provisioning_job_service or ProvisioningJobService()
        )
        self.provisioning_alert_service = (
            provisioning_alert_service or ProvisioningAlertService()
        )
        self.tenant_billing_sync_service = (
            tenant_billing_sync_service or TenantBillingSyncService()
        )
        self.billing_alert_service = billing_alert_service or BillingAlertService()
        self.enabled = (
            settings.OBSERVABILITY_PROMETHEUS_TEXTFILE_ENABLED
            if enabled is None
            else enabled
        )
        self.output_path = output_path or settings.OBSERVABILITY_PROMETHEUS_TEXTFILE_PATH

    def export_current_summary(self, db: Session) -> int:
        if not self.enabled:
            return 0

        summary = self.provisioning_job_service.summarize_jobs_by_tenant(db)
        detailed_summary = self.provisioning_job_service.summarize_jobs_by_tenant_and_job_type(
            db
        )
        error_code_summary = self.provisioning_job_service.summarize_jobs_by_tenant_and_error_code(
            db
        )
        provisioning_alerts = self.provisioning_alert_service.list_active_alerts(db)
        billing_summary = self.tenant_billing_sync_service.summarize_all_recent_events(db)
        billing_alerts = self.billing_alert_service.list_active_alerts(db)
        output = self._render_prometheus_textfile(
            summary,
            detailed_summary,
            error_code_summary,
            provisioning_alerts,
            billing_summary,
            billing_alerts,
        )
        self._write_atomically(output)
        return len(summary)

    def _write_atomically(self, content: str) -> None:
        output_path = Path(self.output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        tmp_path = output_path.with_suffix(output_path.suffix + ".tmp")
        tmp_path.write_text(content, encoding="utf-8")
        tmp_path.replace(output_path)

    def _render_prometheus_textfile(
        self,
        summary: list[dict],
        detailed_summary: list[dict],
        error_code_summary: list[dict],
        provisioning_alerts: list[dict],
        billing_summary: list[dict],
        billing_alerts: list[dict],
    ) -> str:
        lines = [
            "# HELP platform_paas_provisioning_jobs Current provisioning jobs by tenant and status",
            "# TYPE platform_paas_provisioning_jobs gauge",
        ]
        status_fields = [
            ("pending", "pending_jobs"),
            ("retry_pending", "retry_pending_jobs"),
            ("running", "running_jobs"),
            ("completed", "completed_jobs"),
            ("failed", "failed_jobs"),
        ]

        for item in summary:
            tenant_slug = self._escape_label_value(item["tenant_slug"])
            tenant_id = item["tenant_id"]
            for status, field_name in status_fields:
                lines.append(
                    "platform_paas_provisioning_jobs"
                    f'{{tenant_id="{tenant_id}",tenant_slug="{tenant_slug}",status="{status}"}} '
                    f'{item[field_name]}'
                )

        lines.extend(
            [
                "# HELP platform_paas_provisioning_jobs_by_type Current provisioning jobs by tenant, job type and status",
                "# TYPE platform_paas_provisioning_jobs_by_type gauge",
            ]
        )
        for item in detailed_summary:
            tenant_slug = self._escape_label_value(item["tenant_slug"])
            job_type = self._escape_label_value(item["job_type"])
            tenant_id = item["tenant_id"]
            for status, field_name in status_fields:
                lines.append(
                    "platform_paas_provisioning_jobs_by_type"
                    f'{{tenant_id="{tenant_id}",tenant_slug="{tenant_slug}",job_type="{job_type}",status="{status}"}} '
                    f'{item[field_name]}'
                )

        lines.extend(
            [
                "# HELP platform_paas_provisioning_jobs_by_error_code Current provisioning jobs by tenant, error code and status",
                "# TYPE platform_paas_provisioning_jobs_by_error_code gauge",
            ]
        )
        for item in error_code_summary:
            tenant_slug = self._escape_label_value(item["tenant_slug"])
            error_code = self._escape_label_value(item["error_code"])
            tenant_id = item["tenant_id"]
            for status, field_name in status_fields:
                lines.append(
                    "platform_paas_provisioning_jobs_by_error_code"
                    f'{{tenant_id="{tenant_id}",tenant_slug="{tenant_slug}",error_code="{error_code}",status="{status}"}} '
                    f'{item[field_name]}'
                )

        lines.extend(
            [
                "# HELP platform_paas_provisioning_total_jobs Current total provisioning jobs by tenant",
                "# TYPE platform_paas_provisioning_total_jobs gauge",
            ]
        )
        for item in summary:
            tenant_slug = self._escape_label_value(item["tenant_slug"])
            lines.append(
                "platform_paas_provisioning_total_jobs"
                f'{{tenant_id="{item["tenant_id"]}",tenant_slug="{tenant_slug}"}} '
                f'{item["total_jobs"]}'
            )

        lines.extend(
            [
                "# HELP platform_paas_provisioning_max_attempts_seen Max attempts seen by tenant",
                "# TYPE platform_paas_provisioning_max_attempts_seen gauge",
            ]
        )
        for item in summary:
            tenant_slug = self._escape_label_value(item["tenant_slug"])
            lines.append(
                "platform_paas_provisioning_max_attempts_seen"
                f'{{tenant_id="{item["tenant_id"]}",tenant_slug="{tenant_slug}"}} '
                f'{item["max_attempts_seen"]}'
            )

        lines.extend(
            [
                "# HELP platform_paas_provisioning_tenants_with_jobs Total tenants currently represented in provisioning metrics",
                "# TYPE platform_paas_provisioning_tenants_with_jobs gauge",
                f"platform_paas_provisioning_tenants_with_jobs {len(summary)}",
            ]
        )

        lines.extend(
            [
                "# HELP platform_paas_provisioning_active_alerts Current active provisioning alerts",
                "# TYPE platform_paas_provisioning_active_alerts gauge",
                f"platform_paas_provisioning_active_alerts {len(provisioning_alerts)}",
            ]
        )

        severity_counts = self._count_by_key(provisioning_alerts, "severity")
        lines.extend(
            [
                "# HELP platform_paas_provisioning_active_alerts_by_severity Current active provisioning alerts by severity",
                "# TYPE platform_paas_provisioning_active_alerts_by_severity gauge",
            ]
        )
        for severity, count in severity_counts.items():
            lines.append(
                "platform_paas_provisioning_active_alerts_by_severity"
                f'{{severity="{self._escape_label_value(severity)}"}} {count}'
            )

        code_counts = self._count_by_key(provisioning_alerts, "alert_code")
        lines.extend(
            [
                "# HELP platform_paas_provisioning_active_alerts_by_code Current active provisioning alerts by code",
                "# TYPE platform_paas_provisioning_active_alerts_by_code gauge",
            ]
        )
        for alert_code, count in code_counts.items():
            lines.append(
                "platform_paas_provisioning_active_alerts_by_code"
                f'{{alert_code="{self._escape_label_value(alert_code)}"}} {count}'
            )

        tenant_counts = self._count_by_key(
            provisioning_alerts,
            "tenant_slug",
            default_value="__none__",
        )
        lines.extend(
            [
                "# HELP platform_paas_provisioning_active_alerts_by_tenant Current active provisioning alerts by tenant",
                "# TYPE platform_paas_provisioning_active_alerts_by_tenant gauge",
            ]
        )
        for tenant_slug, count in tenant_counts.items():
            lines.append(
                "platform_paas_provisioning_active_alerts_by_tenant"
                f'{{tenant_slug="{self._escape_label_value(tenant_slug)}"}} {count}'
            )

        profile_counts = self._count_by_key(
            provisioning_alerts,
            "worker_profile",
            default_value="__none__",
        )
        lines.extend(
            [
                "# HELP platform_paas_provisioning_active_alerts_by_worker_profile Current active provisioning alerts by worker profile",
                "# TYPE platform_paas_provisioning_active_alerts_by_worker_profile gauge",
            ]
        )
        for worker_profile, count in profile_counts.items():
            lines.append(
                "platform_paas_provisioning_active_alerts_by_worker_profile"
                f'{{worker_profile="{self._escape_label_value(worker_profile)}"}} {count}'
            )

        lines.extend(
            [
                "# HELP platform_paas_billing_sync_events_total Current aggregated billing sync events by provider, event type and processing result",
                "# TYPE platform_paas_billing_sync_events_total gauge",
            ]
        )
        for item in billing_summary:
            lines.append(
                "platform_paas_billing_sync_events_total"
                f'{{provider="{self._escape_label_value(item["provider"])}",event_type="{self._escape_label_value(item["event_type"])}",processing_result="{self._escape_label_value(item["processing_result"])}"}} '
                f'{item["total_events"]}'
            )

        lines.extend(
            [
                "# HELP platform_paas_billing_sync_tenants_total Current distinct tenants represented in billing sync event aggregates",
                "# TYPE platform_paas_billing_sync_tenants_total gauge",
            ]
        )
        for item in billing_summary:
            lines.append(
                "platform_paas_billing_sync_tenants_total"
                f'{{provider="{self._escape_label_value(item["provider"])}",event_type="{self._escape_label_value(item["event_type"])}",processing_result="{self._escape_label_value(item["processing_result"])}"}} '
                f'{item["total_tenants"]}'
            )

        lines.extend(
            [
                "# HELP platform_paas_billing_active_alerts Current active billing alerts",
                "# TYPE platform_paas_billing_active_alerts gauge",
                f"platform_paas_billing_active_alerts {len(billing_alerts)}",
            ]
        )

        billing_severity_counts = self._count_by_key(billing_alerts, "severity")
        lines.extend(
            [
                "# HELP platform_paas_billing_active_alerts_by_severity Current active billing alerts by severity",
                "# TYPE platform_paas_billing_active_alerts_by_severity gauge",
            ]
        )
        for severity, count in billing_severity_counts.items():
            lines.append(
                "platform_paas_billing_active_alerts_by_severity"
                f'{{severity="{self._escape_label_value(severity)}"}} {count}'
            )

        billing_code_counts = self._count_by_key(billing_alerts, "alert_code")
        lines.extend(
            [
                "# HELP platform_paas_billing_active_alerts_by_code Current active billing alerts by code",
                "# TYPE platform_paas_billing_active_alerts_by_code gauge",
            ]
        )
        for alert_code, count in billing_code_counts.items():
            lines.append(
                "platform_paas_billing_active_alerts_by_code"
                f'{{alert_code="{self._escape_label_value(alert_code)}"}} {count}'
            )

        billing_provider_counts = self._count_by_key(billing_alerts, "provider")
        lines.extend(
            [
                "# HELP platform_paas_billing_active_alerts_by_provider Current active billing alerts by provider",
                "# TYPE platform_paas_billing_active_alerts_by_provider gauge",
            ]
        )
        for provider, count in billing_provider_counts.items():
            lines.append(
                "platform_paas_billing_active_alerts_by_provider"
                f'{{provider="{self._escape_label_value(provider)}"}} {count}'
            )

        billing_result_counts = self._count_by_key(
            billing_alerts,
            "processing_result",
            default_value="__none__",
        )
        lines.extend(
            [
                "# HELP platform_paas_billing_active_alerts_by_processing_result Current active billing alerts by processing result",
                "# TYPE platform_paas_billing_active_alerts_by_processing_result gauge",
            ]
        )
        for processing_result, count in billing_result_counts.items():
            lines.append(
                "platform_paas_billing_active_alerts_by_processing_result"
                f'{{processing_result="{self._escape_label_value(processing_result)}"}} {count}'
            )

        lines.append("")
        return "\n".join(lines)

    def _escape_label_value(self, value: str) -> str:
        return value.replace("\\", "\\\\").replace('"', '\\"')

    def _count_by_key(
        self,
        rows: list[dict],
        key: str,
        *,
        default_value: str | None = None,
    ) -> dict[str, int]:
        counts: dict[str, int] = {}
        for row in rows:
            raw_value = row.get(key)
            normalized_value = (
                default_value
                if raw_value in (None, "")
                else str(raw_value)
            )
            if normalized_value is None:
                continue
            counts[normalized_value] = counts.get(normalized_value, 0) + 1
        return counts
