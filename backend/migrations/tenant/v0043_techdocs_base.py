from sqlalchemy import inspect, text

MIGRATION_ID = "0043_techdocs_base"
DESCRIPTION = "Add technical dossier module with sections, measurements, evidences and audit"


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

    if "techdocs_dossiers" not in existing_tables:
        _drop_orphan_postgres_composite_type(connection, "techdocs_dossiers")
        connection.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS techdocs_dossiers (
                    id SERIAL PRIMARY KEY,
                    client_id INTEGER REFERENCES business_clients(id) ON DELETE SET NULL,
                    site_id INTEGER REFERENCES business_sites(id) ON DELETE SET NULL,
                    installation_id INTEGER REFERENCES maintenance_installations(id) ON DELETE SET NULL,
                    opportunity_id INTEGER REFERENCES crm_opportunities(id) ON DELETE SET NULL,
                    work_order_id INTEGER REFERENCES maintenance_work_orders(id) ON DELETE SET NULL,
                    task_id INTEGER REFERENCES taskops_tasks(id) ON DELETE SET NULL,
                    owner_user_id INTEGER,
                    title VARCHAR(180) NOT NULL,
                    dossier_type VARCHAR(40) NOT NULL DEFAULT 'custom',
                    status VARCHAR(40) NOT NULL DEFAULT 'draft',
                    summary TEXT,
                    objective TEXT,
                    scope_notes TEXT,
                    technical_notes TEXT,
                    version INTEGER NOT NULL DEFAULT 1,
                    approved_by_user_id INTEGER,
                    approved_at TIMESTAMP WITH TIME ZONE,
                    is_active BOOLEAN NOT NULL DEFAULT TRUE,
                    created_by_user_id INTEGER,
                    updated_by_user_id INTEGER,
                    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
                )
                """
                if is_postgres
                else """
                CREATE TABLE IF NOT EXISTS techdocs_dossiers (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    client_id INTEGER REFERENCES business_clients(id) ON DELETE SET NULL,
                    site_id INTEGER REFERENCES business_sites(id) ON DELETE SET NULL,
                    installation_id INTEGER REFERENCES maintenance_installations(id) ON DELETE SET NULL,
                    opportunity_id INTEGER REFERENCES crm_opportunities(id) ON DELETE SET NULL,
                    work_order_id INTEGER REFERENCES maintenance_work_orders(id) ON DELETE SET NULL,
                    task_id INTEGER REFERENCES taskops_tasks(id) ON DELETE SET NULL,
                    owner_user_id INTEGER,
                    title VARCHAR(180) NOT NULL,
                    dossier_type VARCHAR(40) NOT NULL DEFAULT 'custom',
                    status VARCHAR(40) NOT NULL DEFAULT 'draft',
                    summary TEXT,
                    objective TEXT,
                    scope_notes TEXT,
                    technical_notes TEXT,
                    version INTEGER NOT NULL DEFAULT 1,
                    approved_by_user_id INTEGER,
                    approved_at DATETIME,
                    is_active BOOLEAN NOT NULL DEFAULT 1,
                    created_by_user_id INTEGER,
                    updated_by_user_id INTEGER,
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
        )
        for index_name, column_name in (
            ("ix_techdocs_dossiers_client_id", "client_id"),
            ("ix_techdocs_dossiers_site_id", "site_id"),
            ("ix_techdocs_dossiers_installation_id", "installation_id"),
            ("ix_techdocs_dossiers_opportunity_id", "opportunity_id"),
            ("ix_techdocs_dossiers_work_order_id", "work_order_id"),
            ("ix_techdocs_dossiers_task_id", "task_id"),
            ("ix_techdocs_dossiers_owner_user_id", "owner_user_id"),
            ("ix_techdocs_dossiers_title", "title"),
            ("ix_techdocs_dossiers_dossier_type", "dossier_type"),
            ("ix_techdocs_dossiers_status", "status"),
            ("ix_techdocs_dossiers_is_active", "is_active"),
            ("ix_techdocs_dossiers_created_at", "created_at"),
            ("ix_techdocs_dossiers_updated_at", "updated_at"),
        ):
            connection.execute(
                text(f"CREATE INDEX IF NOT EXISTS {index_name} ON techdocs_dossiers ({column_name})")
            )

    if "techdocs_sections" not in existing_tables:
        _drop_orphan_postgres_composite_type(connection, "techdocs_sections")
        connection.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS techdocs_sections (
                    id SERIAL PRIMARY KEY,
                    dossier_id INTEGER NOT NULL REFERENCES techdocs_dossiers(id) ON DELETE CASCADE,
                    section_kind VARCHAR(40) NOT NULL DEFAULT 'custom',
                    title VARCHAR(160) NOT NULL,
                    notes TEXT,
                    sort_order INTEGER NOT NULL DEFAULT 100,
                    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
                )
                """
                if is_postgres
                else """
                CREATE TABLE IF NOT EXISTS techdocs_sections (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    dossier_id INTEGER NOT NULL REFERENCES techdocs_dossiers(id) ON DELETE CASCADE,
                    section_kind VARCHAR(40) NOT NULL DEFAULT 'custom',
                    title VARCHAR(160) NOT NULL,
                    notes TEXT,
                    sort_order INTEGER NOT NULL DEFAULT 100,
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
        )
        for index_name, column_name in (
            ("ix_techdocs_sections_dossier_id", "dossier_id"),
            ("ix_techdocs_sections_section_kind", "section_kind"),
            ("ix_techdocs_sections_sort_order", "sort_order"),
        ):
            connection.execute(
                text(f"CREATE INDEX IF NOT EXISTS {index_name} ON techdocs_sections ({column_name})")
            )

    if "techdocs_measurements" not in existing_tables:
        _drop_orphan_postgres_composite_type(connection, "techdocs_measurements")
        connection.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS techdocs_measurements (
                    id SERIAL PRIMARY KEY,
                    dossier_id INTEGER NOT NULL REFERENCES techdocs_dossiers(id) ON DELETE CASCADE,
                    section_id INTEGER NOT NULL REFERENCES techdocs_sections(id) ON DELETE CASCADE,
                    label VARCHAR(160) NOT NULL,
                    measured_value VARCHAR(160),
                    unit VARCHAR(40),
                    expected_range VARCHAR(160),
                    notes TEXT,
                    sort_order INTEGER NOT NULL DEFAULT 100,
                    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
                )
                """
                if is_postgres
                else """
                CREATE TABLE IF NOT EXISTS techdocs_measurements (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    dossier_id INTEGER NOT NULL REFERENCES techdocs_dossiers(id) ON DELETE CASCADE,
                    section_id INTEGER NOT NULL REFERENCES techdocs_sections(id) ON DELETE CASCADE,
                    label VARCHAR(160) NOT NULL,
                    measured_value VARCHAR(160),
                    unit VARCHAR(40),
                    expected_range VARCHAR(160),
                    notes TEXT,
                    sort_order INTEGER NOT NULL DEFAULT 100,
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
        )
        for index_name, column_name in (
            ("ix_techdocs_measurements_dossier_id", "dossier_id"),
            ("ix_techdocs_measurements_section_id", "section_id"),
            ("ix_techdocs_measurements_sort_order", "sort_order"),
        ):
            connection.execute(
                text(f"CREATE INDEX IF NOT EXISTS {index_name} ON techdocs_measurements ({column_name})")
            )

    if "techdocs_evidences" not in existing_tables:
        _drop_orphan_postgres_composite_type(connection, "techdocs_evidences")
        connection.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS techdocs_evidences (
                    id SERIAL PRIMARY KEY,
                    dossier_id INTEGER NOT NULL REFERENCES techdocs_dossiers(id) ON DELETE CASCADE,
                    evidence_kind VARCHAR(40) NOT NULL DEFAULT 'photo',
                    file_name VARCHAR(255) NOT NULL,
                    storage_key VARCHAR(255) NOT NULL,
                    content_type VARCHAR(120),
                    file_size INTEGER NOT NULL DEFAULT 0,
                    description TEXT,
                    uploaded_by_user_id INTEGER,
                    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
                )
                """
                if is_postgres
                else """
                CREATE TABLE IF NOT EXISTS techdocs_evidences (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    dossier_id INTEGER NOT NULL REFERENCES techdocs_dossiers(id) ON DELETE CASCADE,
                    evidence_kind VARCHAR(40) NOT NULL DEFAULT 'photo',
                    file_name VARCHAR(255) NOT NULL,
                    storage_key VARCHAR(255) NOT NULL,
                    content_type VARCHAR(120),
                    file_size INTEGER NOT NULL DEFAULT 0,
                    description TEXT,
                    uploaded_by_user_id INTEGER,
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
        )
        for index_name, column_name in (
            ("ix_techdocs_evidences_dossier_id", "dossier_id"),
            ("ix_techdocs_evidences_evidence_kind", "evidence_kind"),
            ("ix_techdocs_evidences_created_at", "created_at"),
        ):
            connection.execute(
                text(f"CREATE INDEX IF NOT EXISTS {index_name} ON techdocs_evidences ({column_name})")
            )

    if "techdocs_audit_events" not in existing_tables:
        _drop_orphan_postgres_composite_type(connection, "techdocs_audit_events")
        connection.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS techdocs_audit_events (
                    id SERIAL PRIMARY KEY,
                    dossier_id INTEGER NOT NULL REFERENCES techdocs_dossiers(id) ON DELETE CASCADE,
                    event_type VARCHAR(60) NOT NULL,
                    summary VARCHAR(200),
                    payload_json TEXT,
                    created_by_user_id INTEGER,
                    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
                )
                """
                if is_postgres
                else """
                CREATE TABLE IF NOT EXISTS techdocs_audit_events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    dossier_id INTEGER NOT NULL REFERENCES techdocs_dossiers(id) ON DELETE CASCADE,
                    event_type VARCHAR(60) NOT NULL,
                    summary VARCHAR(200),
                    payload_json TEXT,
                    created_by_user_id INTEGER,
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
        )
        for index_name, column_name in (
            ("ix_techdocs_audit_events_dossier_id", "dossier_id"),
            ("ix_techdocs_audit_events_event_type", "event_type"),
            ("ix_techdocs_audit_events_created_at", "created_at"),
        ):
            connection.execute(
                text(f"CREATE INDEX IF NOT EXISTS {index_name} ON techdocs_audit_events ({column_name})")
            )
