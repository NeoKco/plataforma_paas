from sqlalchemy.orm import Session

from app.apps.platform_control.models.billing_operational_alert import (
    BillingOperationalAlert,
)


class BillingOperationalAlertRepository:
    def save_many(
        self,
        db: Session,
        *,
        rows: list[dict],
    ) -> list[BillingOperationalAlert]:
        alerts = [BillingOperationalAlert(**row) for row in rows]
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
        provider: str | None = None,
        event_type: str | None = None,
        processing_result: str | None = None,
        alert_code: str | None = None,
        severity: str | None = None,
    ) -> list[BillingOperationalAlert]:
        query = db.query(BillingOperationalAlert)

        if provider:
            query = query.filter(BillingOperationalAlert.provider == provider)
        if event_type:
            query = query.filter(BillingOperationalAlert.event_type == event_type)
        if processing_result:
            query = query.filter(
                BillingOperationalAlert.processing_result == processing_result
            )
        if alert_code:
            query = query.filter(BillingOperationalAlert.alert_code == alert_code)
        if severity:
            query = query.filter(BillingOperationalAlert.severity == severity)

        return (
            query.order_by(
                BillingOperationalAlert.source_recorded_at.desc(),
                BillingOperationalAlert.id.desc(),
            )
            .limit(limit)
            .all()
        )
