from app.apps.platform_control.models.tenant_policy_change_event import (
    TenantPolicyChangeEvent,
)

MIGRATION_ID = "0017_tenant_policy_change_events"
DESCRIPTION = "Create tenant policy change events table"


def upgrade(connection) -> None:
    TenantPolicyChangeEvent.__table__.create(
        bind=connection,
        checkfirst=True,
    )
