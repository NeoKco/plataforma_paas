from sqlalchemy import inspect, text


MIGRATION_ID = "0025_tenant_bootstrap_admin"
DESCRIPTION = "Add explicit bootstrap admin fields to tenants"


def upgrade(connection) -> None:
    existing_columns = {
        column["name"] for column in inspect(connection).get_columns("tenants")
    }
    if "bootstrap_admin_full_name" not in existing_columns:
        connection.execute(
            text(
                """
                ALTER TABLE tenants
                ADD COLUMN bootstrap_admin_full_name VARCHAR(150)
                """
            )
        )
    if "bootstrap_admin_email" not in existing_columns:
        connection.execute(
            text(
                """
                ALTER TABLE tenants
                ADD COLUMN bootstrap_admin_email VARCHAR(255)
                """
            )
        )
    if "bootstrap_admin_password_hash" not in existing_columns:
        connection.execute(
            text(
                """
                ALTER TABLE tenants
                ADD COLUMN bootstrap_admin_password_hash VARCHAR(255)
                """
            )
        )
