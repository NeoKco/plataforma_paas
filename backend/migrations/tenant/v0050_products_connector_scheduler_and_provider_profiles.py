from sqlalchemy import inspect, text

MIGRATION_ID = "0050_products_connector_scheduler_and_provider_profiles"
DESCRIPTION = "Add provider profiles and formal connector scheduler metadata"


def _ensure_column(connection, table_name: str, column_name: str, ddl: str) -> None:
    inspector = inspect(connection)
    columns = {column["name"] for column in inspector.get_columns(table_name)}
    if column_name not in columns:
        connection.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {ddl}"))


def _datetime_type(connection) -> str:
    return "TIMESTAMP WITH TIME ZONE" if connection.dialect.name == "postgresql" else "DATETIME"


def _boolean_type(connection, *, default: bool = False) -> str:
    if connection.dialect.name == "postgresql":
        return f"BOOLEAN NOT NULL DEFAULT {'TRUE' if default else 'FALSE'}"
    return f"BOOLEAN NOT NULL DEFAULT {1 if default else 0}"


def upgrade(connection) -> None:
    dt = _datetime_type(connection)

    _ensure_column(
        connection,
        "products_connectors",
        "provider_key",
        "provider_key VARCHAR(40) NOT NULL DEFAULT 'generic'",
    )
    _ensure_column(
        connection,
        "products_connectors",
        "schedule_enabled",
        f"schedule_enabled {_boolean_type(connection)}",
    )
    _ensure_column(
        connection,
        "products_connectors",
        "schedule_scope",
        "schedule_scope VARCHAR(40) NOT NULL DEFAULT 'due_sources'",
    )
    _ensure_column(
        connection,
        "products_connectors",
        "schedule_frequency",
        "schedule_frequency VARCHAR(40) NOT NULL DEFAULT 'daily'",
    )
    _ensure_column(
        connection,
        "products_connectors",
        "schedule_batch_limit",
        "schedule_batch_limit INTEGER NOT NULL DEFAULT 50",
    )
    _ensure_column(
        connection,
        "products_connectors",
        "next_scheduled_run_at",
        f"next_scheduled_run_at {dt}",
    )
    _ensure_column(
        connection,
        "products_connectors",
        "last_scheduled_run_at",
        f"last_scheduled_run_at {dt}",
    )
    _ensure_column(
        connection,
        "products_connectors",
        "last_schedule_status",
        "last_schedule_status VARCHAR(40) NOT NULL DEFAULT 'idle'",
    )
    _ensure_column(
        connection,
        "products_connectors",
        "last_schedule_summary",
        "last_schedule_summary TEXT",
    )

    connection.execute(
        text(
            "CREATE INDEX IF NOT EXISTS ix_products_connectors_provider_key "
            "ON products_connectors (provider_key)"
        )
    )
    connection.execute(
        text(
            "CREATE INDEX IF NOT EXISTS ix_products_connectors_schedule_enabled "
            "ON products_connectors (schedule_enabled)"
        )
    )
    connection.execute(
        text(
            "CREATE INDEX IF NOT EXISTS ix_products_connectors_next_scheduled_run_at "
            "ON products_connectors (next_scheduled_run_at)"
        )
    )
    connection.execute(
        text(
            "CREATE INDEX IF NOT EXISTS ix_products_connectors_last_schedule_status "
            "ON products_connectors (last_schedule_status)"
        )
    )


def downgrade(connection) -> None:
    return None
