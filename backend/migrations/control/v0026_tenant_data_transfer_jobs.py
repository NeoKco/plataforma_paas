from app.apps.platform_control.models.tenant_data_transfer_artifact import (
    TenantDataTransferArtifact,
)
from app.apps.platform_control.models.tenant_data_transfer_job import (
    TenantDataTransferJob,
)


MIGRATION_ID = "0026_tenant_data_transfer_jobs"
DESCRIPTION = "Add tenant data portability export job tracking tables"


def upgrade(connection) -> None:
    TenantDataTransferJob.__table__.create(bind=connection, checkfirst=True)
    TenantDataTransferArtifact.__table__.create(bind=connection, checkfirst=True)
