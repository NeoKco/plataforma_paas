from sqlalchemy import inspect, text

MIGRATION_ID = "0045_crm_product_ingestion"
DESCRIPTION = "Add CRM product ingestion drafts for assisted scraping and catalog review"


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

    if "crm_product_ingestion_drafts" not in existing_tables:
        _drop_orphan_postgres_composite_type(connection, "crm_product_ingestion_drafts")
        connection.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS crm_product_ingestion_drafts (
                    id SERIAL PRIMARY KEY,
                    source_kind VARCHAR(40) NOT NULL DEFAULT 'manual_capture',
                    source_label VARCHAR(180),
                    source_url VARCHAR(500),
                    external_reference VARCHAR(180),
                    capture_status VARCHAR(40) NOT NULL DEFAULT 'draft',
                    sku VARCHAR(80),
                    name VARCHAR(180),
                    brand VARCHAR(120),
                    category_label VARCHAR(120),
                    product_type VARCHAR(40) NOT NULL DEFAULT 'service',
                    unit_label VARCHAR(40),
                    unit_price DOUBLE PRECISION NOT NULL DEFAULT 0,
                    currency_code VARCHAR(12) NOT NULL DEFAULT 'CLP',
                    description TEXT,
                    source_excerpt TEXT,
                    extraction_notes TEXT,
                    review_notes TEXT,
                    created_by_user_id INTEGER,
                    reviewed_by_user_id INTEGER,
                    published_product_id INTEGER REFERENCES crm_products(id) ON DELETE SET NULL,
                    published_at TIMESTAMP WITH TIME ZONE,
                    discarded_at TIMESTAMP WITH TIME ZONE,
                    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
                )
                """
                if is_postgres
                else """
                CREATE TABLE IF NOT EXISTS crm_product_ingestion_drafts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    source_kind VARCHAR(40) NOT NULL DEFAULT 'manual_capture',
                    source_label VARCHAR(180),
                    source_url VARCHAR(500),
                    external_reference VARCHAR(180),
                    capture_status VARCHAR(40) NOT NULL DEFAULT 'draft',
                    sku VARCHAR(80),
                    name VARCHAR(180),
                    brand VARCHAR(120),
                    category_label VARCHAR(120),
                    product_type VARCHAR(40) NOT NULL DEFAULT 'service',
                    unit_label VARCHAR(40),
                    unit_price FLOAT NOT NULL DEFAULT 0,
                    currency_code VARCHAR(12) NOT NULL DEFAULT 'CLP',
                    description TEXT,
                    source_excerpt TEXT,
                    extraction_notes TEXT,
                    review_notes TEXT,
                    created_by_user_id INTEGER,
                    reviewed_by_user_id INTEGER,
                    published_product_id INTEGER REFERENCES crm_products(id) ON DELETE SET NULL,
                    published_at DATETIME,
                    discarded_at DATETIME,
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
        )
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_crm_product_ingestion_drafts_capture_status ON crm_product_ingestion_drafts (capture_status)"))
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_crm_product_ingestion_drafts_name ON crm_product_ingestion_drafts (name)"))
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_crm_product_ingestion_drafts_sku ON crm_product_ingestion_drafts (sku)"))
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_crm_product_ingestion_drafts_external_reference ON crm_product_ingestion_drafts (external_reference)"))
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_crm_product_ingestion_drafts_published_product_id ON crm_product_ingestion_drafts (published_product_id)"))

    if "crm_product_ingestion_characteristics" not in existing_tables:
        _drop_orphan_postgres_composite_type(connection, "crm_product_ingestion_characteristics")
        connection.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS crm_product_ingestion_characteristics (
                    id SERIAL PRIMARY KEY,
                    draft_id INTEGER NOT NULL REFERENCES crm_product_ingestion_drafts(id) ON DELETE CASCADE,
                    label VARCHAR(120) NOT NULL,
                    value TEXT NOT NULL,
                    sort_order INTEGER NOT NULL DEFAULT 100,
                    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
                )
                """
                if is_postgres
                else """
                CREATE TABLE IF NOT EXISTS crm_product_ingestion_characteristics (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    draft_id INTEGER NOT NULL REFERENCES crm_product_ingestion_drafts(id) ON DELETE CASCADE,
                    label VARCHAR(120) NOT NULL,
                    value TEXT NOT NULL,
                    sort_order INTEGER NOT NULL DEFAULT 100,
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
        )
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_crm_product_ingestion_characteristics_draft_id ON crm_product_ingestion_characteristics (draft_id)"))
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_crm_product_ingestion_characteristics_sort_order ON crm_product_ingestion_characteristics (sort_order)"))


def downgrade(connection) -> None:
    connection.execute(text("DROP TABLE IF EXISTS crm_product_ingestion_characteristics"))
    connection.execute(text("DROP TABLE IF EXISTS crm_product_ingestion_drafts"))
