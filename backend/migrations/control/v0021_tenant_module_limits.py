from sqlalchemy import Text, inspect

MIGRATION_ID = "0021_tenant_module_limits"
DESCRIPTION = "Add tenant module limits json field"


def upgrade(connection) -> None:
    inspector = inspect(connection)
    columns = {column["name"] for column in inspector.get_columns("tenants")}
    if "module_limits_json" in columns:
        return

    connection.exec_driver_sql(
        "ALTER TABLE tenants ADD COLUMN module_limits_json TEXT"
    )
