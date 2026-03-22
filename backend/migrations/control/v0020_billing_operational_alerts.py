from app.apps.platform_control.models.billing_operational_alert import (
    BillingOperationalAlert,
)

MIGRATION_ID = "0020_billing_operational_alerts"
DESCRIPTION = "Create billing operational alerts table"


def upgrade(connection) -> None:
    BillingOperationalAlert.__table__.create(
        bind=connection,
        checkfirst=True,
    )
