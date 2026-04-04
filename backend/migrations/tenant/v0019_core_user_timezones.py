from sqlalchemy import inspect, text

MIGRATION_ID = "0019_core_user_timezones"
DESCRIPTION = "Add tenant and user timezones"


def upgrade(connection) -> None:
    inspector = inspect(connection)

    tenant_info_columns = {column["name"] for column in inspector.get_columns("tenant_info")}
    if "timezone" not in tenant_info_columns:
        connection.execute(
            text(
                "ALTER TABLE tenant_info ADD COLUMN timezone VARCHAR(64) "
                "NOT NULL DEFAULT 'America/Santiago'"
            )
        )
    connection.execute(
        text(
            "UPDATE tenant_info SET timezone = 'America/Santiago' "
            "WHERE timezone IS NULL OR TRIM(timezone) = ''"
        )
    )

    user_columns = {column["name"] for column in inspector.get_columns("users")}
    if "timezone" not in user_columns:
        connection.execute(text("ALTER TABLE users ADD COLUMN timezone VARCHAR(64)"))


def downgrade(connection) -> None:
    # Se deja sin downgrade por compatibilidad con sqlite de pruebas.
    pass
