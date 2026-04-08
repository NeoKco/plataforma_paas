from sqlalchemy import text


MIGRATION_ID = "0025_tenant_bootstrap_admin"
DESCRIPTION = "Add explicit bootstrap admin fields to tenants"


def upgrade(connection) -> None:
    connection.execute(
        text(
            """
            ALTER TABLE tenants
            ADD COLUMN IF NOT EXISTS bootstrap_admin_full_name VARCHAR(150)
            """
        )
    )
    connection.execute(
        text(
            """
            ALTER TABLE tenants
            ADD COLUMN IF NOT EXISTS bootstrap_admin_email VARCHAR(255)
            """
        )
    )
    connection.execute(
        text(
            """
            ALTER TABLE tenants
            ADD COLUMN IF NOT EXISTS bootstrap_admin_password_hash VARCHAR(255)
            """
        )
    )
