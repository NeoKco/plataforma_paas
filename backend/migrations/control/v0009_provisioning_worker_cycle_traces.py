from app.apps.platform_control.models.provisioning_worker_cycle_trace import (
    ProvisioningWorkerCycleTrace,
)

MIGRATION_ID = "0009_provisioning_worker_cycle_traces"
DESCRIPTION = "Create provisioning worker cycle traces table"


def upgrade(connection) -> None:
    ProvisioningWorkerCycleTrace.__table__.create(
        bind=connection,
        checkfirst=True,
    )
