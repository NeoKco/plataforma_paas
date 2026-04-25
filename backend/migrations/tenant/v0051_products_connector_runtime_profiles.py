from sqlalchemy import inspect, text

MIGRATION_ID = "0051_products_connector_runtime_profiles"
DESCRIPTION = "Add runtime connector profile, auth, retry and validation metadata"


def _ensure_column(connection, table_name: str, column_name: str, ddl: str) -> None:
    inspector = inspect(connection)
    columns = {column["name"] for column in inspector.get_columns(table_name)}
    if column_name not in columns:
        connection.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {ddl}"))


def _datetime_type(connection) -> str:
    return "TIMESTAMP WITH TIME ZONE" if connection.dialect.name == "postgresql" else "DATETIME"


def upgrade(connection) -> None:
    dt = _datetime_type(connection)

    _ensure_column(
        connection,
        "products_connectors",
        "provider_profile",
        "provider_profile VARCHAR(60) NOT NULL DEFAULT 'generic_v1'",
    )
    _ensure_column(
        connection,
        "products_connectors",
        "auth_mode",
        "auth_mode VARCHAR(40) NOT NULL DEFAULT 'none'",
    )
    _ensure_column(
        connection,
        "products_connectors",
        "auth_reference",
        "auth_reference VARCHAR(160)",
    )
    _ensure_column(
        connection,
        "products_connectors",
        "request_timeout_seconds",
        "request_timeout_seconds INTEGER NOT NULL DEFAULT 25",
    )
    _ensure_column(
        connection,
        "products_connectors",
        "retry_limit",
        "retry_limit INTEGER NOT NULL DEFAULT 2",
    )
    _ensure_column(
        connection,
        "products_connectors",
        "retry_backoff_seconds",
        "retry_backoff_seconds INTEGER NOT NULL DEFAULT 3",
    )
    _ensure_column(
        connection,
        "products_connectors",
        "last_validation_at",
        f"last_validation_at {dt}",
    )
    _ensure_column(
        connection,
        "products_connectors",
        "last_validation_status",
        "last_validation_status VARCHAR(40) NOT NULL DEFAULT 'idle'",
    )
    _ensure_column(
        connection,
        "products_connectors",
        "last_validation_summary",
        "last_validation_summary TEXT",
    )

    connection.execute(
        text(
            "CREATE INDEX IF NOT EXISTS ix_products_connectors_provider_profile "
            "ON products_connectors (provider_profile)"
        )
    )
    connection.execute(
        text(
            "CREATE INDEX IF NOT EXISTS ix_products_connectors_last_validation_status "
            "ON products_connectors (last_validation_status)"
        )
    )


def downgrade(connection) -> None:
    return None
