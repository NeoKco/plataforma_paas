from app.apps.platform_control.models.tenant_billing_sync_event import (
    TenantBillingSyncEvent,
)

MIGRATION_ID = "0018_tenant_billing_sync_events"
DESCRIPTION = "Create tenant billing sync events table"


def upgrade(connection) -> None:
    TenantBillingSyncEvent.__table__.create(
        bind=connection,
        checkfirst=True,
    )
