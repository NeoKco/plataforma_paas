from app.apps.platform_control.models.auth_audit_event import AuthAuditEvent

MIGRATION_ID = "0003_auth_audit_events"
DESCRIPTION = "Create auth audit events table"


def upgrade(connection) -> None:
    AuthAuditEvent.__table__.create(bind=connection, checkfirst=True)
