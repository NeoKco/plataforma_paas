from app.apps.platform_control.models.provisioning_job_metric_snapshot import (
    ProvisioningJobMetricSnapshot,
)

MIGRATION_ID = "0008_provisioning_metric_snapshots"
DESCRIPTION = "Create provisioning metric snapshots table"


def upgrade(connection) -> None:
    ProvisioningJobMetricSnapshot.__table__.create(
        bind=connection,
        checkfirst=True,
    )
