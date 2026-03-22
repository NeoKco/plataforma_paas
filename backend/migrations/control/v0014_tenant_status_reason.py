from sqlalchemy import inspect, text

MIGRATION_ID = "0014_tenant_status_reason"
DESCRIPTION = "Add status_reason field to tenants"


def upgrade(connection) -> None:
    columns = {
        column["name"] for column in inspect(connection).get_columns("tenants")
    }

    if "status_reason" not in columns:
        connection.execute(
            text(
                "ALTER TABLE tenants "
                "ADD COLUMN status_reason VARCHAR(255) NULL"
            )
        )
