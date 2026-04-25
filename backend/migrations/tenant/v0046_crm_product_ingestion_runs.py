from sqlalchemy import inspect, text

MIGRATION_ID = "0046_crm_product_ingestion_runs"
DESCRIPTION = "Add CRM product ingestion runs for automatic URL scraping and batch status"


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


def upgrade(connection) -> None:
    inspector = inspect(connection)
    existing_tables = set(inspector.get_table_names())
    is_postgres = connection.dialect.name == "postgresql"

    if "crm_product_ingestion_runs" not in existing_tables:
        _drop_orphan_postgres_composite_type(connection, "crm_product_ingestion_runs")
        connection.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS crm_product_ingestion_runs (
                    id SERIAL PRIMARY KEY,
                    status VARCHAR(40) NOT NULL DEFAULT 'queued',
                    source_mode VARCHAR(40) NOT NULL DEFAULT 'url_batch',
                    source_label VARCHAR(180),
                    requested_count INTEGER NOT NULL DEFAULT 0,
                    processed_count INTEGER NOT NULL DEFAULT 0,
                    completed_count INTEGER NOT NULL DEFAULT 0,
                    error_count INTEGER NOT NULL DEFAULT 0,
                    cancelled_count INTEGER NOT NULL DEFAULT 0,
                    created_by_user_id INTEGER,
                    started_at TIMESTAMP WITH TIME ZONE,
                    finished_at TIMESTAMP WITH TIME ZONE,
                    cancelled_at TIMESTAMP WITH TIME ZONE,
                    last_error TEXT,
                    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
                )
                """
                if is_postgres
                else """
                CREATE TABLE IF NOT EXISTS crm_product_ingestion_runs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    status VARCHAR(40) NOT NULL DEFAULT 'queued',
                    source_mode VARCHAR(40) NOT NULL DEFAULT 'url_batch',
                    source_label VARCHAR(180),
                    requested_count INTEGER NOT NULL DEFAULT 0,
                    processed_count INTEGER NOT NULL DEFAULT 0,
                    completed_count INTEGER NOT NULL DEFAULT 0,
                    error_count INTEGER NOT NULL DEFAULT 0,
                    cancelled_count INTEGER NOT NULL DEFAULT 0,
                    created_by_user_id INTEGER,
                    started_at DATETIME,
                    finished_at DATETIME,
                    cancelled_at DATETIME,
                    last_error TEXT,
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
        )
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_crm_product_ingestion_runs_status ON crm_product_ingestion_runs (status)"))
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_crm_product_ingestion_runs_created_at ON crm_product_ingestion_runs (created_at)"))

    if "crm_product_ingestion_run_items" not in existing_tables:
        _drop_orphan_postgres_composite_type(connection, "crm_product_ingestion_run_items")
        connection.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS crm_product_ingestion_run_items (
                    id SERIAL PRIMARY KEY,
                    run_id INTEGER NOT NULL REFERENCES crm_product_ingestion_runs(id) ON DELETE CASCADE,
                    source_url VARCHAR(500) NOT NULL,
                    source_label VARCHAR(180),
                    external_reference VARCHAR(180),
                    item_status VARCHAR(40) NOT NULL DEFAULT 'queued',
                    draft_id INTEGER REFERENCES crm_product_ingestion_drafts(id) ON DELETE SET NULL,
                    extracted_name VARCHAR(180),
                    error_message TEXT,
                    processed_at TIMESTAMP WITH TIME ZONE,
                    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
                )
                """
                if is_postgres
                else """
                CREATE TABLE IF NOT EXISTS crm_product_ingestion_run_items (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    run_id INTEGER NOT NULL REFERENCES crm_product_ingestion_runs(id) ON DELETE CASCADE,
                    source_url VARCHAR(500) NOT NULL,
                    source_label VARCHAR(180),
                    external_reference VARCHAR(180),
                    item_status VARCHAR(40) NOT NULL DEFAULT 'queued',
                    draft_id INTEGER REFERENCES crm_product_ingestion_drafts(id) ON DELETE SET NULL,
                    extracted_name VARCHAR(180),
                    error_message TEXT,
                    processed_at DATETIME,
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
        )
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_crm_product_ingestion_run_items_run_id ON crm_product_ingestion_run_items (run_id)"))
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_crm_product_ingestion_run_items_item_status ON crm_product_ingestion_run_items (item_status)"))
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_crm_product_ingestion_run_items_draft_id ON crm_product_ingestion_run_items (draft_id)"))


def downgrade(connection) -> None:
    connection.execute(text("DROP TABLE IF EXISTS crm_product_ingestion_run_items"))
    connection.execute(text("DROP TABLE IF EXISTS crm_product_ingestion_runs"))
