from sqlalchemy import inspect


MIGRATION_ID = "0022_tenant_schema_tracking"
DESCRIPTION = "Track tenant schema version and last sync time"


def upgrade(connection) -> None:
    existing_columns = {
        column["name"] for column in inspect(connection).get_columns("tenants")
    }

    if "tenant_schema_version" not in existing_columns:
        connection.exec_driver_sql(
            "ALTER TABLE tenants ADD COLUMN tenant_schema_version VARCHAR(100)"
        )

    if "tenant_schema_synced_at" not in existing_columns:
        connection.exec_driver_sql(
            "ALTER TABLE tenants ADD COLUMN tenant_schema_synced_at TIMESTAMP"
        )
