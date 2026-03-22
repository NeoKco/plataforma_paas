from app.apps.platform_control.models.auth_token import AuthToken

MIGRATION_ID = "0002_auth_tokens"
DESCRIPTION = "Create auth token registry table"


def upgrade(connection) -> None:
    AuthToken.__table__.create(bind=connection, checkfirst=True)
