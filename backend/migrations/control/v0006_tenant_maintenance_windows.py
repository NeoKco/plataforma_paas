from sqlalchemy import inspect, text

MIGRATION_ID = "0006_tenant_maintenance_windows"
DESCRIPTION = "Add maintenance window fields to tenants"


def upgrade(connection) -> None:
    columns = {
        column["name"]
        for column in inspect(connection).get_columns("tenants")
    }

    statements: list[str] = []
    if "maintenance_starts_at" not in columns:
        statements.append(
            "ALTER TABLE tenants "
            "ADD COLUMN maintenance_starts_at TIMESTAMP NULL"
        )
    if "maintenance_ends_at" not in columns:
        statements.append(
            "ALTER TABLE tenants "
            "ADD COLUMN maintenance_ends_at TIMESTAMP NULL"
        )
    if "maintenance_reason" not in columns:
        statements.append(
            "ALTER TABLE tenants "
            "ADD COLUMN maintenance_reason VARCHAR(255) NULL"
        )

    for statement in statements:
        connection.execute(text(statement))
