from sqlalchemy import inspect, text

MIGRATION_ID = "0015_tenant_plan_code"
DESCRIPTION = "Add plan_code field to tenants"


def upgrade(connection) -> None:
    columns = {
        column["name"] for column in inspect(connection).get_columns("tenants")
    }

    if "plan_code" not in columns:
        connection.execute(
            text(
                "ALTER TABLE tenants "
                "ADD COLUMN plan_code VARCHAR(50) NULL"
            )
        )
