from sqlalchemy import inspect, text

MIGRATION_ID = "0007_tenant_maintenance_policy"
DESCRIPTION = "Add maintenance scope and access mode to tenants"


def upgrade(connection) -> None:
    columns = {
        column["name"]
        for column in inspect(connection).get_columns("tenants")
    }

    statements: list[str] = []
    if "maintenance_scopes" not in columns:
        statements.append(
            "ALTER TABLE tenants "
            "ADD COLUMN maintenance_scopes VARCHAR(255) NULL"
        )
    if "maintenance_access_mode" not in columns:
        statements.append(
            "ALTER TABLE tenants "
            "ADD COLUMN maintenance_access_mode VARCHAR(50) NOT NULL DEFAULT 'write_block'"
        )

    for statement in statements:
        connection.execute(text(statement))
