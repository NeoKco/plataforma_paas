from sqlalchemy.orm import Session

from app.apps.platform_control.models.provisioning_operational_alert import (
    ProvisioningOperationalAlert,
)


class ProvisioningOperationalAlertRepository:
    def save_many(
        self,
        db: Session,
        *,
        rows: list[dict],
    ) -> list[ProvisioningOperationalAlert]:
        alerts = [ProvisioningOperationalAlert(**row) for row in rows]
        if not alerts:
            return []

        db.add_all(alerts)
        db.commit()
        for alert in alerts:
            db.refresh(alert)
        return alerts

    def list_recent(
        self,
        db: Session,
        *,
        limit: int = 100,
        tenant_slug: str | None = None,
        worker_profile: str | None = None,
        alert_code: str | None = None,
        severity: str | None = None,
    ) -> list[ProvisioningOperationalAlert]:
        query = db.query(ProvisioningOperationalAlert)

        if tenant_slug:
            query = query.filter(ProvisioningOperationalAlert.tenant_slug == tenant_slug)
        if worker_profile:
            query = query.filter(
                ProvisioningOperationalAlert.worker_profile == worker_profile
            )
        if alert_code:
            query = query.filter(ProvisioningOperationalAlert.alert_code == alert_code)
        if severity:
            query = query.filter(ProvisioningOperationalAlert.severity == severity)

        return (
            query.order_by(
                ProvisioningOperationalAlert.source_captured_at.desc(),
                ProvisioningOperationalAlert.id.desc(),
            )
            .limit(limit)
            .all()
        )
