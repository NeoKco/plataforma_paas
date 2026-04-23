from sqlalchemy import inspect, text

MIGRATION_ID = "0041_crm_expansion"
DESCRIPTION = "Expand CRM with opportunity subresources, structured quotes, and reusable templates"


def _column_names(inspector, table_name: str) -> set[str]:
    return {column["name"] for column in inspector.get_columns(table_name)}


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

    if "crm_products" in existing_tables:
        product_columns = _column_names(inspector, "crm_products")
        if "created_at" not in product_columns:
            pass

    if "crm_product_characteristics" not in existing_tables:
        _drop_orphan_postgres_composite_type(connection, "crm_product_characteristics")
        connection.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS crm_product_characteristics (
                    id SERIAL PRIMARY KEY,
                    product_id INTEGER NOT NULL REFERENCES crm_products(id) ON DELETE CASCADE,
                    label VARCHAR(120) NOT NULL,
                    value TEXT NOT NULL,
                    sort_order INTEGER NOT NULL DEFAULT 100,
                    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
                )
                """
                if is_postgres
                else """
                CREATE TABLE IF NOT EXISTS crm_product_characteristics (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    product_id INTEGER NOT NULL REFERENCES crm_products(id) ON DELETE CASCADE,
                    label VARCHAR(120) NOT NULL,
                    value TEXT NOT NULL,
                    sort_order INTEGER NOT NULL DEFAULT 100,
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
        )
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_crm_product_characteristics_product_id ON crm_product_characteristics (product_id)"))

    if "crm_opportunities" in existing_tables:
        opportunity_columns = _column_names(inspector, "crm_opportunities")
        if "closed_at" not in opportunity_columns:
            connection.execute(
                text("ALTER TABLE crm_opportunities ADD COLUMN closed_at TIMESTAMP WITH TIME ZONE")
                if is_postgres
                else text("ALTER TABLE crm_opportunities ADD COLUMN closed_at DATETIME")
            )
        if "close_reason" not in opportunity_columns:
            connection.execute(text("ALTER TABLE crm_opportunities ADD COLUMN close_reason VARCHAR(120)"))
        if "close_notes" not in opportunity_columns:
            connection.execute(text("ALTER TABLE crm_opportunities ADD COLUMN close_notes TEXT"))
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_crm_opportunities_closed_at ON crm_opportunities (closed_at)"))
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_crm_opportunities_close_reason ON crm_opportunities (close_reason)"))

    if "crm_opportunity_contacts" not in existing_tables:
        _drop_orphan_postgres_composite_type(connection, "crm_opportunity_contacts")
        connection.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS crm_opportunity_contacts (
                    id SERIAL PRIMARY KEY,
                    opportunity_id INTEGER NOT NULL REFERENCES crm_opportunities(id) ON DELETE CASCADE,
                    full_name VARCHAR(160) NOT NULL,
                    role VARCHAR(120),
                    email VARCHAR(180),
                    phone VARCHAR(80),
                    notes TEXT,
                    sort_order INTEGER NOT NULL DEFAULT 100,
                    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
                )
                """
                if is_postgres
                else """
                CREATE TABLE IF NOT EXISTS crm_opportunity_contacts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    opportunity_id INTEGER NOT NULL REFERENCES crm_opportunities(id) ON DELETE CASCADE,
                    full_name VARCHAR(160) NOT NULL,
                    role VARCHAR(120),
                    email VARCHAR(180),
                    phone VARCHAR(80),
                    notes TEXT,
                    sort_order INTEGER NOT NULL DEFAULT 100,
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
        )
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_crm_opportunity_contacts_opportunity_id ON crm_opportunity_contacts (opportunity_id)"))

    if "crm_opportunity_notes" not in existing_tables:
        _drop_orphan_postgres_composite_type(connection, "crm_opportunity_notes")
        connection.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS crm_opportunity_notes (
                    id SERIAL PRIMARY KEY,
                    opportunity_id INTEGER NOT NULL REFERENCES crm_opportunities(id) ON DELETE CASCADE,
                    note TEXT NOT NULL,
                    created_by_user_id INTEGER,
                    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
                )
                """
                if is_postgres
                else """
                CREATE TABLE IF NOT EXISTS crm_opportunity_notes (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    opportunity_id INTEGER NOT NULL REFERENCES crm_opportunities(id) ON DELETE CASCADE,
                    note TEXT NOT NULL,
                    created_by_user_id INTEGER,
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
        )
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_crm_opportunity_notes_opportunity_id ON crm_opportunity_notes (opportunity_id)"))

    if "crm_opportunity_activities" not in existing_tables:
        _drop_orphan_postgres_composite_type(connection, "crm_opportunity_activities")
        connection.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS crm_opportunity_activities (
                    id SERIAL PRIMARY KEY,
                    opportunity_id INTEGER NOT NULL REFERENCES crm_opportunities(id) ON DELETE CASCADE,
                    activity_type VARCHAR(60) NOT NULL,
                    description TEXT,
                    scheduled_at TIMESTAMP WITH TIME ZONE,
                    status VARCHAR(40) NOT NULL DEFAULT 'scheduled',
                    created_by_user_id INTEGER,
                    completed_at TIMESTAMP WITH TIME ZONE,
                    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
                )
                """
                if is_postgres
                else """
                CREATE TABLE IF NOT EXISTS crm_opportunity_activities (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    opportunity_id INTEGER NOT NULL REFERENCES crm_opportunities(id) ON DELETE CASCADE,
                    activity_type VARCHAR(60) NOT NULL,
                    description TEXT,
                    scheduled_at DATETIME,
                    status VARCHAR(40) NOT NULL DEFAULT 'scheduled',
                    created_by_user_id INTEGER,
                    completed_at DATETIME,
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
        )
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_crm_opportunity_activities_opportunity_id ON crm_opportunity_activities (opportunity_id)"))
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_crm_opportunity_activities_status ON crm_opportunity_activities (status)"))

    if "crm_opportunity_attachments" not in existing_tables:
        _drop_orphan_postgres_composite_type(connection, "crm_opportunity_attachments")
        connection.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS crm_opportunity_attachments (
                    id SERIAL PRIMARY KEY,
                    opportunity_id INTEGER NOT NULL REFERENCES crm_opportunities(id) ON DELETE CASCADE,
                    file_name VARCHAR(255) NOT NULL,
                    storage_key VARCHAR(255) NOT NULL,
                    content_type VARCHAR(120),
                    file_size INTEGER NOT NULL DEFAULT 0,
                    notes TEXT,
                    uploaded_by_user_id INTEGER,
                    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
                )
                """
                if is_postgres
                else """
                CREATE TABLE IF NOT EXISTS crm_opportunity_attachments (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    opportunity_id INTEGER NOT NULL REFERENCES crm_opportunities(id) ON DELETE CASCADE,
                    file_name VARCHAR(255) NOT NULL,
                    storage_key VARCHAR(255) NOT NULL,
                    content_type VARCHAR(120),
                    file_size INTEGER NOT NULL DEFAULT 0,
                    notes TEXT,
                    uploaded_by_user_id INTEGER,
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
        )
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_crm_opportunity_attachments_opportunity_id ON crm_opportunity_attachments (opportunity_id)"))

    if "crm_opportunity_stage_events" not in existing_tables:
        _drop_orphan_postgres_composite_type(connection, "crm_opportunity_stage_events")
        connection.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS crm_opportunity_stage_events (
                    id SERIAL PRIMARY KEY,
                    opportunity_id INTEGER NOT NULL REFERENCES crm_opportunities(id) ON DELETE CASCADE,
                    event_type VARCHAR(60) NOT NULL,
                    from_stage VARCHAR(40),
                    to_stage VARCHAR(40),
                    summary VARCHAR(180),
                    notes TEXT,
                    created_by_user_id INTEGER,
                    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
                )
                """
                if is_postgres
                else """
                CREATE TABLE IF NOT EXISTS crm_opportunity_stage_events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    opportunity_id INTEGER NOT NULL REFERENCES crm_opportunities(id) ON DELETE CASCADE,
                    event_type VARCHAR(60) NOT NULL,
                    from_stage VARCHAR(40),
                    to_stage VARCHAR(40),
                    summary VARCHAR(180),
                    notes TEXT,
                    created_by_user_id INTEGER,
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
        )
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_crm_opportunity_stage_events_opportunity_id ON crm_opportunity_stage_events (opportunity_id)"))
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_crm_opportunity_stage_events_event_type ON crm_opportunity_stage_events (event_type)"))

    if "crm_quote_templates" not in existing_tables:
        _drop_orphan_postgres_composite_type(connection, "crm_quote_templates")
        connection.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS crm_quote_templates (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(180) NOT NULL,
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
                CREATE TABLE IF NOT EXISTS crm_quote_templates (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name VARCHAR(180) NOT NULL,
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
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_crm_quote_templates_name ON crm_quote_templates (name)"))
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_crm_quote_templates_is_active ON crm_quote_templates (is_active)"))

    if "crm_quote_template_sections" not in existing_tables:
        _drop_orphan_postgres_composite_type(connection, "crm_quote_template_sections")
        connection.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS crm_quote_template_sections (
                    id SERIAL PRIMARY KEY,
                    template_id INTEGER NOT NULL REFERENCES crm_quote_templates(id) ON DELETE CASCADE,
                    title VARCHAR(180) NOT NULL,
                    description TEXT,
                    sort_order INTEGER NOT NULL DEFAULT 100,
                    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
                )
                """
                if is_postgres
                else """
                CREATE TABLE IF NOT EXISTS crm_quote_template_sections (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    template_id INTEGER NOT NULL REFERENCES crm_quote_templates(id) ON DELETE CASCADE,
                    title VARCHAR(180) NOT NULL,
                    description TEXT,
                    sort_order INTEGER NOT NULL DEFAULT 100,
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
        )
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_crm_quote_template_sections_template_id ON crm_quote_template_sections (template_id)"))

    if "crm_quote_template_items" not in existing_tables:
        _drop_orphan_postgres_composite_type(connection, "crm_quote_template_items")
        connection.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS crm_quote_template_items (
                    id SERIAL PRIMARY KEY,
                    section_id INTEGER NOT NULL REFERENCES crm_quote_template_sections(id) ON DELETE CASCADE,
                    product_id INTEGER,
                    line_type VARCHAR(40) NOT NULL DEFAULT 'catalog_item',
                    name VARCHAR(180) NOT NULL,
                    description TEXT,
                    quantity DOUBLE PRECISION NOT NULL DEFAULT 1,
                    unit_price DOUBLE PRECISION NOT NULL DEFAULT 0,
                    sort_order INTEGER NOT NULL DEFAULT 100,
                    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
                )
                """
                if is_postgres
                else """
                CREATE TABLE IF NOT EXISTS crm_quote_template_items (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    section_id INTEGER NOT NULL REFERENCES crm_quote_template_sections(id) ON DELETE CASCADE,
                    product_id INTEGER,
                    line_type VARCHAR(40) NOT NULL DEFAULT 'catalog_item',
                    name VARCHAR(180) NOT NULL,
                    description TEXT,
                    quantity REAL NOT NULL DEFAULT 1,
                    unit_price REAL NOT NULL DEFAULT 0,
                    sort_order INTEGER NOT NULL DEFAULT 100,
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
        )
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_crm_quote_template_items_section_id ON crm_quote_template_items (section_id)"))
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_crm_quote_template_items_product_id ON crm_quote_template_items (product_id)"))

    if "crm_quotes" in existing_tables:
        quote_columns = _column_names(inspector, "crm_quotes")
        if "template_id" not in quote_columns:
            connection.execute(text("ALTER TABLE crm_quotes ADD COLUMN template_id INTEGER"))
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_crm_quotes_template_id ON crm_quotes (template_id)"))

    if "crm_quote_sections" not in existing_tables:
        connection.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS crm_quote_sections (
                    id SERIAL PRIMARY KEY,
                    quote_id INTEGER NOT NULL REFERENCES crm_quotes(id) ON DELETE CASCADE,
                    title VARCHAR(180) NOT NULL,
                    description TEXT,
                    sort_order INTEGER NOT NULL DEFAULT 100,
                    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
                )
                """
                if is_postgres
                else """
                CREATE TABLE IF NOT EXISTS crm_quote_sections (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    quote_id INTEGER NOT NULL REFERENCES crm_quotes(id) ON DELETE CASCADE,
                    title VARCHAR(180) NOT NULL,
                    description TEXT,
                    sort_order INTEGER NOT NULL DEFAULT 100,
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
        )
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_crm_quote_sections_quote_id ON crm_quote_sections (quote_id)"))

    if "crm_quote_lines" in existing_tables:
        quote_line_columns = _column_names(inspector, "crm_quote_lines")
        if "section_id" not in quote_line_columns:
            connection.execute(text("ALTER TABLE crm_quote_lines ADD COLUMN section_id INTEGER"))
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_crm_quote_lines_section_id ON crm_quote_lines (section_id)"))


def downgrade(connection) -> None:
    pass
