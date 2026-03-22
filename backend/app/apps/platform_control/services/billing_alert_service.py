from collections.abc import Sequence
from datetime import datetime

from sqlalchemy.orm import Session

from app.apps.platform_control.models.billing_operational_alert import (
    BillingOperationalAlert,
)
from app.apps.platform_control.repositories.billing_operational_alert_repository import (
    BillingOperationalAlertRepository,
)
from app.apps.platform_control.services.tenant_billing_sync_service import (
    TenantBillingSyncService,
)
from app.common.config.settings import settings


class BillingAlertService:
    def __init__(
        self,
        tenant_billing_sync_service: TenantBillingSyncService | None = None,
        billing_operational_alert_repository: (
            BillingOperationalAlertRepository | None
        ) = None,
    ) -> None:
        self.tenant_billing_sync_service = (
            tenant_billing_sync_service or TenantBillingSyncService()
        )
        self.billing_operational_alert_repository = (
            billing_operational_alert_repository or BillingOperationalAlertRepository()
        )

    def list_active_alerts(
        self,
        db: Session,
        *,
        provider: str | None = None,
        event_type: str | None = None,
    ) -> list[dict]:
        summary_rows = self.tenant_billing_sync_service.summarize_all_recent_events(
            db,
            provider=provider,
            event_type=event_type,
        )

        alerts: list[dict] = []
        alerts.extend(self._build_duplicate_alerts(summary_rows))
        alerts.extend(self._build_ignored_alerts(summary_rows))
        alerts.extend(self._build_provider_volume_alerts(summary_rows))
        return self._sort_alerts(alerts)

    def save_alert_history(
        self,
        db: Session,
        *,
        alerts: list[dict],
    ) -> list[BillingOperationalAlert]:
        rows = [
            {
                "alert_code": str(item["alert_code"]),
                "severity": str(item["severity"]),
                "provider": str(item["provider"]),
                "event_type": item.get("event_type"),
                "processing_result": item.get("processing_result"),
                "message": str(item["message"]),
                "observed_value": int(item["observed_value"]),
                "threshold_value": (
                    None
                    if item.get("threshold_value") is None
                    else int(item["threshold_value"])
                ),
                "total_tenants": int(item.get("total_tenants", 0)),
                "source_recorded_at": item["last_recorded_at"],
            }
            for item in alerts
        ]
        return self.billing_operational_alert_repository.save_many(
            db,
            rows=rows,
        )

    def list_recent_alert_history(
        self,
        db: Session,
        *,
        limit: int = 100,
        provider: str | None = None,
        event_type: str | None = None,
        processing_result: str | None = None,
        alert_code: str | None = None,
        severity: str | None = None,
    ) -> list[dict]:
        alerts = self.billing_operational_alert_repository.list_recent(
            db,
            limit=limit,
            provider=provider.strip().lower() if provider else None,
            event_type=event_type.strip().lower() if event_type else None,
            processing_result=(
                processing_result.strip().lower() if processing_result else None
            ),
            alert_code=alert_code,
            severity=severity,
        )
        return [self.serialize_history_entry(item) for item in alerts]

    def serialize_history_entry(
        self,
        alert: BillingOperationalAlert,
    ) -> dict:
        return {
            "id": alert.id,
            "alert_code": alert.alert_code,
            "severity": alert.severity,
            "provider": alert.provider,
            "event_type": alert.event_type,
            "processing_result": alert.processing_result,
            "message": alert.message,
            "observed_value": alert.observed_value,
            "threshold_value": alert.threshold_value,
            "total_tenants": alert.total_tenants,
            "source_recorded_at": alert.source_recorded_at,
            "recorded_at": alert.recorded_at,
        }

    def _build_duplicate_alerts(self, rows: Sequence[dict]) -> list[dict]:
        threshold = settings.BILLING_ALERT_DUPLICATE_EVENTS_THRESHOLD
        return self._build_threshold_alerts(
            rows=rows,
            processing_result="duplicate",
            threshold=threshold,
            alert_code="billing_duplicate_events_threshold_exceeded",
            severity="warning",
            message_template=(
                "Billing presenta demasiados eventos duplicate para "
                "{provider}/{event_type}"
            ),
        )

    def _build_ignored_alerts(self, rows: Sequence[dict]) -> list[dict]:
        threshold = settings.BILLING_ALERT_IGNORED_EVENTS_THRESHOLD
        return self._build_threshold_alerts(
            rows=rows,
            processing_result="ignored",
            threshold=threshold,
            alert_code="billing_ignored_events_threshold_exceeded",
            severity="warning",
            message_template=(
                "Billing presenta demasiados eventos ignored para "
                "{provider}/{event_type}"
            ),
        )

    def _build_provider_volume_alerts(self, rows: Sequence[dict]) -> list[dict]:
        threshold = settings.BILLING_ALERT_PROVIDER_EVENTS_THRESHOLD
        if threshold <= 0:
            return []

        totals_by_provider: dict[str, dict] = {}
        for row in rows:
            provider = str(row["provider"])
            provider_bucket = totals_by_provider.setdefault(
                provider,
                {
                    "provider": provider,
                    "total_events": 0,
                    "total_tenants": 0,
                    "last_recorded_at": row["last_recorded_at"],
                },
            )
            provider_bucket["total_events"] += int(row["total_events"])
            provider_bucket["total_tenants"] = max(
                int(provider_bucket["total_tenants"]),
                int(row["total_tenants"]),
            )
            if row["last_recorded_at"] > provider_bucket["last_recorded_at"]:
                provider_bucket["last_recorded_at"] = row["last_recorded_at"]

        alerts: list[dict] = []
        for provider_row in totals_by_provider.values():
            observed_value = int(provider_row["total_events"])
            if observed_value < threshold:
                continue
            alerts.append(
                {
                    "alert_code": "billing_provider_event_volume_threshold_exceeded",
                    "severity": "critical",
                    "provider": provider_row["provider"],
                    "event_type": None,
                    "processing_result": None,
                    "message": (
                        "Billing supera el umbral global de eventos para el "
                        f"proveedor {provider_row['provider']}"
                    ),
                    "observed_value": observed_value,
                    "threshold_value": threshold,
                    "total_tenants": int(provider_row["total_tenants"]),
                    "last_recorded_at": provider_row["last_recorded_at"],
                }
            )
        return alerts

    def _build_threshold_alerts(
        self,
        *,
        rows: Sequence[dict],
        processing_result: str,
        threshold: int,
        alert_code: str,
        severity: str,
        message_template: str,
    ) -> list[dict]:
        if threshold <= 0:
            return []

        alerts: list[dict] = []
        for row in rows:
            if row["processing_result"] != processing_result:
                continue
            observed_value = int(row["total_events"])
            if observed_value < threshold:
                continue
            alerts.append(
                {
                    "alert_code": alert_code,
                    "severity": severity,
                    "provider": row["provider"],
                    "event_type": row["event_type"],
                    "processing_result": row["processing_result"],
                    "message": message_template.format(
                        provider=row["provider"],
                        event_type=row["event_type"],
                    ),
                    "observed_value": observed_value,
                    "threshold_value": threshold,
                    "total_tenants": int(row["total_tenants"]),
                    "last_recorded_at": row["last_recorded_at"],
                }
            )
        return alerts

    def _sort_alerts(self, alerts: Sequence[dict]) -> list[dict]:
        severity_rank = {
            "critical": 0,
            "warning": 1,
            "info": 2,
        }
        return sorted(
            alerts,
            key=lambda item: (
                severity_rank.get(str(item["severity"]), 99),
                -int(item["observed_value"]),
                item["provider"] or "",
                item["event_type"] or "",
                item["processing_result"] or "",
                self._timestamp_key(item["last_recorded_at"]),
            ),
        )

    def _timestamp_key(self, value: datetime | None) -> float:
        if value is None:
            return 0.0
        return value.timestamp()
