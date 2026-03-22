from sqlalchemy import inspect, text

MIGRATION_ID = "0004_tenant_maintenance_mode"
DESCRIPTION = "Add maintenance mode flag to tenants"


def upgrade(connection) -> None:
    columns = {
        column["name"]
        for column in inspect(connection).get_columns("tenants")
    }
    if "maintenance_mode" in columns:
        return

    if connection.dialect.name == "sqlite":
        default_literal = "0"
    else:
        default_literal = "false"

    connection.execute(
        text(
            "ALTER TABLE tenants "
            f"ADD COLUMN maintenance_mode BOOLEAN NOT NULL DEFAULT {default_literal}"
        )
    )
