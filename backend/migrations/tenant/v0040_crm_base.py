from sqlalchemy import inspect, text

MIGRATION_ID = "0040_crm_base"
DESCRIPTION = "Create CRM products, opportunities, quotes, and quote lines"


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

    if "crm_products" not in existing_tables:
        _drop_orphan_postgres_composite_type(connection, "crm_products")
        connection.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS crm_products (
                    id SERIAL PRIMARY KEY,
                    sku VARCHAR(80) UNIQUE,
                    name VARCHAR(180) NOT NULL,
                    product_type VARCHAR(40) NOT NULL DEFAULT 'service',
                    unit_label VARCHAR(40),
                    unit_price DOUBLE PRECISION NOT NULL DEFAULT 0,
                    description TEXT,
                    is_active BOOLEAN NOT NULL DEFAULT TRUE,
                    sort_order INTEGER NOT NULL DEFAULT 100,
                    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
                )
                """
                if is_postgres
                else """
                CREATE TABLE IF NOT EXISTS crm_products (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    sku VARCHAR(80) UNIQUE,
                    name VARCHAR(180) NOT NULL,
                    product_type VARCHAR(40) NOT NULL DEFAULT 'service',
                    unit_label VARCHAR(40),
                    unit_price REAL NOT NULL DEFAULT 0,
                    description TEXT,
                    is_active BOOLEAN NOT NULL DEFAULT 1,
                    sort_order INTEGER NOT NULL DEFAULT 100,
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
        )
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_crm_products_name ON crm_products (name)"))
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_crm_products_product_type ON crm_products (product_type)"))
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_crm_products_is_active ON crm_products (is_active)"))

    if "crm_opportunities" not in existing_tables:
        _drop_orphan_postgres_composite_type(connection, "crm_opportunities")
        connection.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS crm_opportunities (
                    id SERIAL PRIMARY KEY,
                    client_id INTEGER REFERENCES business_clients(id) ON DELETE SET NULL,
                    title VARCHAR(180) NOT NULL,
                    stage VARCHAR(40) NOT NULL DEFAULT 'lead',
                    owner_user_id INTEGER,
                    expected_value DOUBLE PRECISION,
                    probability_percent INTEGER NOT NULL DEFAULT 0,
                    expected_close_at TIMESTAMP WITH TIME ZONE,
                    source_channel VARCHAR(80),
                    summary TEXT,
                    next_step TEXT,
                    is_active BOOLEAN NOT NULL DEFAULT TRUE,
                    sort_order INTEGER NOT NULL DEFAULT 100,
                    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
                )
                """
                if is_postgres
                else """
                CREATE TABLE IF NOT EXISTS crm_opportunities (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    client_id INTEGER REFERENCES business_clients(id) ON DELETE SET NULL,
                    title VARCHAR(180) NOT NULL,
                    stage VARCHAR(40) NOT NULL DEFAULT 'lead',
                    owner_user_id INTEGER,
                    expected_value REAL,
                    probability_percent INTEGER NOT NULL DEFAULT 0,
                    expected_close_at DATETIME,
                    source_channel VARCHAR(80),
                    summary TEXT,
                    next_step TEXT,
                    is_active BOOLEAN NOT NULL DEFAULT 1,
                    sort_order INTEGER NOT NULL DEFAULT 100,
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
        )
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_crm_opportunities_client_id ON crm_opportunities (client_id)"))
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_crm_opportunities_stage ON crm_opportunities (stage)"))
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_crm_opportunities_is_active ON crm_opportunities (is_active)"))

    if "crm_quotes" not in existing_tables:
        _drop_orphan_postgres_composite_type(connection, "crm_quotes")
        connection.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS crm_quotes (
                    id SERIAL PRIMARY KEY,
                    client_id INTEGER REFERENCES business_clients(id) ON DELETE SET NULL,
                    opportunity_id INTEGER REFERENCES crm_opportunities(id) ON DELETE SET NULL,
                    quote_number VARCHAR(80) UNIQUE,
                    title VARCHAR(180) NOT NULL,
                    quote_status VARCHAR(40) NOT NULL DEFAULT 'draft',
                    valid_until TIMESTAMP WITH TIME ZONE,
                    subtotal_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
                    discount_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
                    tax_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
                    total_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
                    summary TEXT,
                    notes TEXT,
                    is_active BOOLEAN NOT NULL DEFAULT TRUE,
                    sort_order INTEGER NOT NULL DEFAULT 100,
                    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
                )
                """
                if is_postgres
                else """
                CREATE TABLE IF NOT EXISTS crm_quotes (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    client_id INTEGER REFERENCES business_clients(id) ON DELETE SET NULL,
                    opportunity_id INTEGER REFERENCES crm_opportunities(id) ON DELETE SET NULL,
                    quote_number VARCHAR(80) UNIQUE,
                    title VARCHAR(180) NOT NULL,
                    quote_status VARCHAR(40) NOT NULL DEFAULT 'draft',
                    valid_until DATETIME,
                    subtotal_amount REAL NOT NULL DEFAULT 0,
                    discount_amount REAL NOT NULL DEFAULT 0,
                    tax_amount REAL NOT NULL DEFAULT 0,
                    total_amount REAL NOT NULL DEFAULT 0,
                    summary TEXT,
                    notes TEXT,
                    is_active BOOLEAN NOT NULL DEFAULT 1,
                    sort_order INTEGER NOT NULL DEFAULT 100,
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
        )
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_crm_quotes_client_id ON crm_quotes (client_id)"))
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_crm_quotes_opportunity_id ON crm_quotes (opportunity_id)"))
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_crm_quotes_quote_status ON crm_quotes (quote_status)"))
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_crm_quotes_is_active ON crm_quotes (is_active)"))

    if "crm_quote_lines" not in existing_tables:
        _drop_orphan_postgres_composite_type(connection, "crm_quote_lines")
        connection.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS crm_quote_lines (
                    id SERIAL PRIMARY KEY,
                    quote_id INTEGER NOT NULL REFERENCES crm_quotes(id) ON DELETE CASCADE,
                    product_id INTEGER REFERENCES crm_products(id) ON DELETE SET NULL,
                    line_type VARCHAR(40) NOT NULL DEFAULT 'catalog_item',
                    name VARCHAR(180) NOT NULL,
                    description TEXT,
                    quantity DOUBLE PRECISION NOT NULL DEFAULT 1,
                    unit_price DOUBLE PRECISION NOT NULL DEFAULT 0,
                    line_total DOUBLE PRECISION NOT NULL DEFAULT 0,
                    sort_order INTEGER NOT NULL DEFAULT 100,
                    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
                )
                """
                if is_postgres
                else """
                CREATE TABLE IF NOT EXISTS crm_quote_lines (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    quote_id INTEGER NOT NULL REFERENCES crm_quotes(id) ON DELETE CASCADE,
                    product_id INTEGER REFERENCES crm_products(id) ON DELETE SET NULL,
                    line_type VARCHAR(40) NOT NULL DEFAULT 'catalog_item',
                    name VARCHAR(180) NOT NULL,
                    description TEXT,
                    quantity REAL NOT NULL DEFAULT 1,
                    unit_price REAL NOT NULL DEFAULT 0,
                    line_total REAL NOT NULL DEFAULT 0,
                    sort_order INTEGER NOT NULL DEFAULT 100,
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
        )
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_crm_quote_lines_quote_id ON crm_quote_lines (quote_id)"))
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_crm_quote_lines_product_id ON crm_quote_lines (product_id)"))


def downgrade(connection) -> None:
    pass
