from sqlalchemy import inspect, text

MIGRATION_ID = "0047_products_sources_and_connectors"
DESCRIPTION = "Add products source history, connector profiles, and price tracking"


def _drop_orphan_postgres_composite_type(connection, table_name: str) -> None:
    if connection.dialect.name != "postgresql":
        return
    connection.execute(
        text(
            f"""
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1
                    FROM pg_type t
                    JOIN pg_namespace n ON n.oid = t.typnamespace
                    WHERE t.typname = '{table_name}'
                      AND n.nspname = current_schema()
                ) AND NOT EXISTS (
                    SELECT 1
                    FROM pg_class c
                    JOIN pg_namespace n ON n.oid = c.relnamespace
                    WHERE c.relname = '{table_name}'
                      AND c.relkind IN ('r', 'p')
                      AND n.nspname = current_schema()
                ) THEN
                    EXECUTE 'DROP TYPE IF EXISTS "{table_name}"';
                END IF;
            END
            $$;
            """
        )
    )


def _ensure_column(connection, table_name: str, column_name: str, ddl: str) -> None:
    inspector = inspect(connection)
    columns = {column["name"] for column in inspector.get_columns(table_name)}
    if column_name not in columns:
        connection.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {ddl}"))


def upgrade(connection) -> None:
    inspector = inspect(connection)
    existing_tables = set(inspector.get_table_names())
    is_postgres = connection.dialect.name == "postgresql"

    if "products_connectors" not in existing_tables:
        _drop_orphan_postgres_composite_type(connection, "products_connectors")
        connection.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS products_connectors (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(160) NOT NULL,
                    connector_kind VARCHAR(40) NOT NULL DEFAULT 'generic_url',
                    base_url VARCHAR(500),
                    default_currency_code VARCHAR(12) NOT NULL DEFAULT 'CLP',
                    supports_batch BOOLEAN NOT NULL DEFAULT TRUE,
                    supports_price_tracking BOOLEAN NOT NULL DEFAULT TRUE,
                    is_active BOOLEAN NOT NULL DEFAULT TRUE,
                    config_notes TEXT,
                    last_sync_at TIMESTAMP WITH TIME ZONE,
                    last_sync_status VARCHAR(40) NOT NULL DEFAULT 'idle',
                    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
                )
                """
                if is_postgres
                else """
                CREATE TABLE IF NOT EXISTS products_connectors (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name VARCHAR(160) NOT NULL,
                    connector_kind VARCHAR(40) NOT NULL DEFAULT 'generic_url',
                    base_url VARCHAR(500),
                    default_currency_code VARCHAR(12) NOT NULL DEFAULT 'CLP',
                    supports_batch BOOLEAN NOT NULL DEFAULT 1,
                    supports_price_tracking BOOLEAN NOT NULL DEFAULT 1,
                    is_active BOOLEAN NOT NULL DEFAULT 1,
                    config_notes TEXT,
                    last_sync_at DATETIME,
                    last_sync_status VARCHAR(40) NOT NULL DEFAULT 'idle',
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
        )
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_products_connectors_name ON products_connectors (name)"))
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_products_connectors_kind ON products_connectors (connector_kind)"))
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_products_connectors_is_active ON products_connectors (is_active)"))

    if "products_product_sources" not in existing_tables:
        _drop_orphan_postgres_composite_type(connection, "products_product_sources")
        connection.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS products_product_sources (
                    id SERIAL PRIMARY KEY,
                    product_id INTEGER NOT NULL REFERENCES crm_products(id) ON DELETE CASCADE,
                    connector_id INTEGER REFERENCES products_connectors(id) ON DELETE SET NULL,
                    draft_id INTEGER REFERENCES crm_product_ingestion_drafts(id) ON DELETE SET NULL,
                    run_item_id INTEGER REFERENCES crm_product_ingestion_run_items(id) ON DELETE SET NULL,
                    source_kind VARCHAR(40) NOT NULL DEFAULT 'manual_capture',
                    source_label VARCHAR(180),
                    source_url VARCHAR(500),
                    external_reference VARCHAR(180),
                    source_status VARCHAR(40) NOT NULL DEFAULT 'active',
                    latest_unit_price DOUBLE PRECISION NOT NULL DEFAULT 0,
                    currency_code VARCHAR(12) NOT NULL DEFAULT 'CLP',
                    source_summary TEXT,
                    captured_at TIMESTAMP WITH TIME ZONE,
                    last_seen_at TIMESTAMP WITH TIME ZONE,
                    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
                )
                """
                if is_postgres
                else """
                CREATE TABLE IF NOT EXISTS products_product_sources (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    product_id INTEGER NOT NULL REFERENCES crm_products(id) ON DELETE CASCADE,
                    connector_id INTEGER REFERENCES products_connectors(id) ON DELETE SET NULL,
                    draft_id INTEGER REFERENCES crm_product_ingestion_drafts(id) ON DELETE SET NULL,
                    run_item_id INTEGER REFERENCES crm_product_ingestion_run_items(id) ON DELETE SET NULL,
                    source_kind VARCHAR(40) NOT NULL DEFAULT 'manual_capture',
                    source_label VARCHAR(180),
                    source_url VARCHAR(500),
                    external_reference VARCHAR(180),
                    source_status VARCHAR(40) NOT NULL DEFAULT 'active',
                    latest_unit_price FLOAT NOT NULL DEFAULT 0,
                    currency_code VARCHAR(12) NOT NULL DEFAULT 'CLP',
                    source_summary TEXT,
                    captured_at DATETIME,
                    last_seen_at DATETIME,
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
        )
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_products_product_sources_product_id ON products_product_sources (product_id)"))
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_products_product_sources_connector_id ON products_product_sources (connector_id)"))
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_products_product_sources_source_status ON products_product_sources (source_status)"))
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_products_product_sources_source_url ON products_product_sources (source_url)"))
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_products_product_sources_external_reference ON products_product_sources (external_reference)"))

    if "products_price_history" not in existing_tables:
        _drop_orphan_postgres_composite_type(connection, "products_price_history")
        connection.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS products_price_history (
                    id SERIAL PRIMARY KEY,
                    product_id INTEGER NOT NULL REFERENCES crm_products(id) ON DELETE CASCADE,
                    product_source_id INTEGER REFERENCES products_product_sources(id) ON DELETE SET NULL,
                    connector_id INTEGER REFERENCES products_connectors(id) ON DELETE SET NULL,
                    draft_id INTEGER REFERENCES crm_product_ingestion_drafts(id) ON DELETE SET NULL,
                    price_kind VARCHAR(40) NOT NULL DEFAULT 'reference',
                    unit_price DOUBLE PRECISION NOT NULL DEFAULT 0,
                    currency_code VARCHAR(12) NOT NULL DEFAULT 'CLP',
                    source_label VARCHAR(180),
                    source_url VARCHAR(500),
                    notes TEXT,
                    captured_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
                )
                """
                if is_postgres
                else """
                CREATE TABLE IF NOT EXISTS products_price_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    product_id INTEGER NOT NULL REFERENCES crm_products(id) ON DELETE CASCADE,
                    product_source_id INTEGER REFERENCES products_product_sources(id) ON DELETE SET NULL,
                    connector_id INTEGER REFERENCES products_connectors(id) ON DELETE SET NULL,
                    draft_id INTEGER REFERENCES crm_product_ingestion_drafts(id) ON DELETE SET NULL,
                    price_kind VARCHAR(40) NOT NULL DEFAULT 'reference',
                    unit_price FLOAT NOT NULL DEFAULT 0,
                    currency_code VARCHAR(12) NOT NULL DEFAULT 'CLP',
                    source_label VARCHAR(180),
                    source_url VARCHAR(500),
                    notes TEXT,
                    captured_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
        )
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_products_price_history_product_id ON products_price_history (product_id)"))
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_products_price_history_source_id ON products_price_history (product_source_id)"))
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_products_price_history_connector_id ON products_price_history (connector_id)"))
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_products_price_history_captured_at ON products_price_history (captured_at)"))

    _ensure_column(
        connection,
        "crm_product_ingestion_drafts",
        "connector_id",
        "connector_id INTEGER REFERENCES products_connectors(id) ON DELETE SET NULL",
    )
    _ensure_column(
        connection,
        "crm_product_ingestion_runs",
        "connector_id",
        "connector_id INTEGER REFERENCES products_connectors(id) ON DELETE SET NULL",
    )
    _ensure_column(
        connection,
        "crm_product_ingestion_run_items",
        "connector_id",
        "connector_id INTEGER REFERENCES products_connectors(id) ON DELETE SET NULL",
    )

    connection.execute(text("CREATE INDEX IF NOT EXISTS ix_crm_product_ingestion_drafts_connector_id ON crm_product_ingestion_drafts (connector_id)"))
    connection.execute(text("CREATE INDEX IF NOT EXISTS ix_crm_product_ingestion_runs_connector_id ON crm_product_ingestion_runs (connector_id)"))
    connection.execute(text("CREATE INDEX IF NOT EXISTS ix_crm_product_ingestion_run_items_connector_id ON crm_product_ingestion_run_items (connector_id)"))


def downgrade(connection) -> None:
    connection.execute(text("DROP TABLE IF EXISTS products_price_history"))
    connection.execute(text("DROP TABLE IF EXISTS products_product_sources"))
    connection.execute(text("DROP TABLE IF EXISTS products_connectors"))
