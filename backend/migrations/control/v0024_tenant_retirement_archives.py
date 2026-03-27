from app.apps.platform_control.models.tenant_retirement_archive import (
    TenantRetirementArchive,
)

MIGRATION_ID = "0024_tenant_retirement_archives"
DESCRIPTION = "Create tenant retirement archives table"


def upgrade(connection) -> None:
    TenantRetirementArchive.__table__.create(
        bind=connection,
        checkfirst=True,
    )
