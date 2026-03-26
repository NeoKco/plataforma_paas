from sqlalchemy import inspect


MIGRATION_ID = "0023_tenant_db_credentials_tracking"
DESCRIPTION = "Track last tenant DB credentials rotation time"


def upgrade(connection) -> None:
    existing_columns = {
        column["name"] for column in inspect(connection).get_columns("tenants")
    }

    if "tenant_db_credentials_rotated_at" not in existing_columns:
        connection.exec_driver_sql(
            "ALTER TABLE tenants ADD COLUMN tenant_db_credentials_rotated_at TIMESTAMP"
        )
