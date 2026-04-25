from sqlalchemy import inspect, text

MIGRATION_ID = "0049_products_live_refresh"
DESCRIPTION = "Add live product refresh metadata and batch refresh runs"


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
    run_id_type = "BIGSERIAL PRIMARY KEY" if connection.dialect.name == "postgresql" else "INTEGER PRIMARY KEY"

    _ensure_column(
        connection,
        "products_product_sources",
        "refresh_mode",
        "refresh_mode VARCHAR(40) NOT NULL DEFAULT 'manual'",
    )
    _ensure_column(
        connection,
        "products_product_sources",
        "refresh_merge_policy",
        "refresh_merge_policy VARCHAR(40) NOT NULL DEFAULT 'safe_merge'",
    )
    _ensure_column(
        connection,
        "products_product_sources",
        "refresh_prompt",
        "refresh_prompt TEXT",
    )
    _ensure_column(
        connection,
        "products_product_sources",
        "next_refresh_at",
        f"next_refresh_at {dt}",
    )
    _ensure_column(
        connection,
        "products_product_sources",
        "last_refresh_success_at",
        f"last_refresh_success_at {dt}",
    )

    connection.execute(
        text(
            """
            CREATE TABLE IF NOT EXISTS products_refresh_runs (
                id """
            + run_id_type
            + """,
                status VARCHAR(40) NOT NULL DEFAULT 'queued',
                scope VARCHAR(40) NOT NULL DEFAULT 'due_sources',
                scope_label VARCHAR(180),
                connector_id INTEGER REFERENCES products_connectors(id) ON DELETE SET NULL,
                requested_count INTEGER NOT NULL DEFAULT 0,
                processed_count INTEGER NOT NULL DEFAULT 0,
                completed_count INTEGER NOT NULL DEFAULT 0,
                error_count INTEGER NOT NULL DEFAULT 0,
                cancelled_count INTEGER NOT NULL DEFAULT 0,
                created_by_user_id INTEGER,
                prefer_ai BOOLEAN NOT NULL DEFAULT FALSE,
                started_at """
            + dt
            + """,
                finished_at """
            + dt
            + """,
                cancelled_at """
            + dt
            + """,
                last_error TEXT,
                created_at """
            + dt
            + """ DEFAULT CURRENT_TIMESTAMP NOT NULL,
                updated_at """
            + dt
            + """ DEFAULT CURRENT_TIMESTAMP NOT NULL
            )
            """
        )
    )

    connection.execute(
        text(
            """
            CREATE TABLE IF NOT EXISTS products_refresh_run_items (
                id """
            + run_id_type
            + """,
                run_id INTEGER NOT NULL REFERENCES products_refresh_runs(id) ON DELETE CASCADE,
                product_id INTEGER NOT NULL REFERENCES crm_products(id) ON DELETE CASCADE,
                product_source_id INTEGER REFERENCES products_product_sources(id) ON DELETE SET NULL,
                item_status VARCHAR(40) NOT NULL DEFAULT 'queued',
                source_url VARCHAR(500),
                source_label VARCHAR(180),
                merge_policy VARCHAR(40) NOT NULL DEFAULT 'safe_merge',
                used_ai_enrichment """
            + _boolean_type(connection)
            + """,
                detected_changes_json TEXT,
                error_message TEXT,
                processed_at """
            + dt
            + """,
                created_at """
            + dt
            + """ DEFAULT CURRENT_TIMESTAMP NOT NULL,
                updated_at """
            + dt
            + """ DEFAULT CURRENT_TIMESTAMP NOT NULL
            )
            """
        )
    )

    connection.execute(
        text(
            "CREATE INDEX IF NOT EXISTS ix_products_product_sources_refresh_mode "
            "ON products_product_sources (refresh_mode)"
        )
    )
    connection.execute(
        text(
            "CREATE INDEX IF NOT EXISTS ix_products_product_sources_next_refresh_at "
            "ON products_product_sources (next_refresh_at)"
        )
    )
    connection.execute(
        text(
            "CREATE INDEX IF NOT EXISTS ix_products_product_sources_last_refresh_success_at "
            "ON products_product_sources (last_refresh_success_at)"
        )
    )
    connection.execute(
        text(
            "CREATE INDEX IF NOT EXISTS ix_products_refresh_runs_status "
            "ON products_refresh_runs (status)"
        )
    )
    connection.execute(
        text(
            "CREATE INDEX IF NOT EXISTS ix_products_refresh_runs_scope "
            "ON products_refresh_runs (scope)"
        )
    )
    connection.execute(
        text(
            "CREATE INDEX IF NOT EXISTS ix_products_refresh_run_items_run_id "
            "ON products_refresh_run_items (run_id)"
        )
    )
    connection.execute(
        text(
            "CREATE INDEX IF NOT EXISTS ix_products_refresh_run_items_product_id "
            "ON products_refresh_run_items (product_id)"
        )
    )
    connection.execute(
        text(
            "CREATE INDEX IF NOT EXISTS ix_products_refresh_run_items_item_status "
            "ON products_refresh_run_items (item_status)"
        )
    )


def downgrade(connection) -> None:
    # Forward-only baseline. Tables and columns are retained once introduced.
    return None
