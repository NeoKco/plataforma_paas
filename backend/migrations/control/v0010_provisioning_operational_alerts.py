from app.apps.platform_control.models.provisioning_operational_alert import (
    ProvisioningOperationalAlert,
)

MIGRATION_ID = "0010_provisioning_operational_alerts"
DESCRIPTION = "Create provisioning operational alerts table"


def upgrade(connection) -> None:
    ProvisioningOperationalAlert.__table__.create(
        bind=connection,
        checkfirst=True,
    )
