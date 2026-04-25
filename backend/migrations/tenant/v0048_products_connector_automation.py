from sqlalchemy import inspect, text

MIGRATION_ID = "0048_products_connector_automation"
DESCRIPTION = "Add automatic connector sync metadata and source sync state"


def _ensure_column(connection, table_name: str, column_name: str, ddl: str) -> None:
    inspector = inspect(connection)
    columns = {column["name"] for column in inspector.get_columns(table_name)}
    if column_name not in columns:
        connection.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {ddl}"))


def upgrade(connection) -> None:
    _ensure_column(
        connection,
        "products_connectors",
        "sync_mode",
        "sync_mode VARCHAR(40) NOT NULL DEFAULT 'manual'",
    )
    _ensure_column(
        connection,
        "products_connectors",
        "fetch_strategy",
        "fetch_strategy VARCHAR(40) NOT NULL DEFAULT 'html_generic'",
    )
    _ensure_column(
        connection,
        "products_connectors",
        "run_ai_enrichment",
        (
            "run_ai_enrichment BOOLEAN NOT NULL DEFAULT FALSE"
            if connection.dialect.name == "postgresql"
            else "run_ai_enrichment BOOLEAN NOT NULL DEFAULT 0"
        ),
    )
    _ensure_column(
        connection,
        "products_connectors",
        "last_sync_summary",
        "last_sync_summary TEXT",
    )

    _ensure_column(
        connection,
        "products_product_sources",
        "sync_status",
        "sync_status VARCHAR(40) NOT NULL DEFAULT 'idle'",
    )
    _ensure_column(
        connection,
        "products_product_sources",
        "last_sync_attempt_at",
        (
            "last_sync_attempt_at TIMESTAMP WITH TIME ZONE"
            if connection.dialect.name == "postgresql"
            else "last_sync_attempt_at DATETIME"
        ),
    )
    _ensure_column(
        connection,
        "products_product_sources",
        "last_sync_error",
        "last_sync_error TEXT",
    )

    connection.execute(
        text(
            "CREATE INDEX IF NOT EXISTS ix_products_connectors_sync_mode "
            "ON products_connectors (sync_mode)"
        )
    )
    connection.execute(
        text(
            "CREATE INDEX IF NOT EXISTS ix_products_connectors_fetch_strategy "
            "ON products_connectors (fetch_strategy)"
        )
    )
    connection.execute(
        text(
            "CREATE INDEX IF NOT EXISTS ix_products_product_sources_sync_status "
            "ON products_product_sources (sync_status)"
        )
    )
    connection.execute(
        text(
            "CREATE INDEX IF NOT EXISTS ix_products_product_sources_last_sync_attempt_at "
            "ON products_product_sources (last_sync_attempt_at)"
        )
    )


def downgrade(connection) -> None:
    # Forward-only baseline. Columns are kept once introduced.
    return None
