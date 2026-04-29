from sqlalchemy import inspect, text

MIGRATION_ID = "0054_tenant_user_permission_overrides"
DESCRIPTION = "Add tenant user granted and revoked permission overrides"


def _column_exists(inspector, table_name: str, column_name: str) -> bool:
    return any(column["name"] == column_name for column in inspector.get_columns(table_name))


def upgrade(connection) -> None:
    inspector = inspect(connection)
    existing_tables = set(inspector.get_table_names())
    if "users" not in existing_tables:
        return

    if not _column_exists(inspector, "users", "granted_permissions_json"):
        connection.execute(
            text("ALTER TABLE users ADD COLUMN granted_permissions_json TEXT")
        )

    if not _column_exists(inspector, "users", "revoked_permissions_json"):
        connection.execute(
            text("ALTER TABLE users ADD COLUMN revoked_permissions_json TEXT")
        )


def downgrade(connection) -> None:
    return None
