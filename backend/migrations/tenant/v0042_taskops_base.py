from sqlalchemy import inspect, text

MIGRATION_ID = "0042_taskops_base"
DESCRIPTION = "Add TaskOps tasks, comments, attachments and status history"


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

    if "taskops_tasks" not in existing_tables:
        _drop_orphan_postgres_composite_type(connection, "taskops_tasks")
        connection.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS taskops_tasks (
                    id SERIAL PRIMARY KEY,
                    client_id INTEGER REFERENCES business_clients(id) ON DELETE SET NULL,
                    opportunity_id INTEGER REFERENCES crm_opportunities(id) ON DELETE SET NULL,
                    work_order_id INTEGER REFERENCES maintenance_work_orders(id) ON DELETE SET NULL,
                    assigned_user_id INTEGER,
                    assigned_work_group_id INTEGER REFERENCES business_work_groups(id) ON DELETE SET NULL,
                    title VARCHAR(180) NOT NULL,
                    description TEXT,
                    status VARCHAR(40) NOT NULL DEFAULT 'backlog',
                    priority VARCHAR(40) NOT NULL DEFAULT 'normal',
                    due_at TIMESTAMP WITH TIME ZONE,
                    started_at TIMESTAMP WITH TIME ZONE,
                    completed_at TIMESTAMP WITH TIME ZONE,
                    created_by_user_id INTEGER,
                    updated_by_user_id INTEGER,
                    is_active BOOLEAN NOT NULL DEFAULT TRUE,
                    sort_order INTEGER NOT NULL DEFAULT 100,
                    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
                )
                """
                if is_postgres
                else """
                CREATE TABLE IF NOT EXISTS taskops_tasks (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    client_id INTEGER REFERENCES business_clients(id) ON DELETE SET NULL,
                    opportunity_id INTEGER REFERENCES crm_opportunities(id) ON DELETE SET NULL,
                    work_order_id INTEGER REFERENCES maintenance_work_orders(id) ON DELETE SET NULL,
                    assigned_user_id INTEGER,
                    assigned_work_group_id INTEGER REFERENCES business_work_groups(id) ON DELETE SET NULL,
                    title VARCHAR(180) NOT NULL,
                    description TEXT,
                    status VARCHAR(40) NOT NULL DEFAULT 'backlog',
                    priority VARCHAR(40) NOT NULL DEFAULT 'normal',
                    due_at DATETIME,
                    started_at DATETIME,
                    completed_at DATETIME,
                    created_by_user_id INTEGER,
                    updated_by_user_id INTEGER,
                    is_active BOOLEAN NOT NULL DEFAULT 1,
                    sort_order INTEGER NOT NULL DEFAULT 100,
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
        )
        for index_name, column_name in (
            ("ix_taskops_tasks_client_id", "client_id"),
            ("ix_taskops_tasks_opportunity_id", "opportunity_id"),
            ("ix_taskops_tasks_work_order_id", "work_order_id"),
            ("ix_taskops_tasks_assigned_user_id", "assigned_user_id"),
            ("ix_taskops_tasks_assigned_work_group_id", "assigned_work_group_id"),
            ("ix_taskops_tasks_status", "status"),
            ("ix_taskops_tasks_priority", "priority"),
            ("ix_taskops_tasks_due_at", "due_at"),
            ("ix_taskops_tasks_completed_at", "completed_at"),
            ("ix_taskops_tasks_is_active", "is_active"),
            ("ix_taskops_tasks_sort_order", "sort_order"),
            ("ix_taskops_tasks_created_at", "created_at"),
        ):
            connection.execute(
                text(f"CREATE INDEX IF NOT EXISTS {index_name} ON taskops_tasks ({column_name})")
            )

    if "taskops_task_comments" not in existing_tables:
        _drop_orphan_postgres_composite_type(connection, "taskops_task_comments")
        connection.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS taskops_task_comments (
                    id SERIAL PRIMARY KEY,
                    task_id INTEGER NOT NULL REFERENCES taskops_tasks(id) ON DELETE CASCADE,
                    comment TEXT NOT NULL,
                    created_by_user_id INTEGER,
                    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
                )
                """
                if is_postgres
                else """
                CREATE TABLE IF NOT EXISTS taskops_task_comments (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    task_id INTEGER NOT NULL REFERENCES taskops_tasks(id) ON DELETE CASCADE,
                    comment TEXT NOT NULL,
                    created_by_user_id INTEGER,
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
        )
        connection.execute(
            text(
                "CREATE INDEX IF NOT EXISTS ix_taskops_task_comments_task_id ON taskops_task_comments (task_id)"
            )
        )

    if "taskops_task_attachments" not in existing_tables:
        _drop_orphan_postgres_composite_type(connection, "taskops_task_attachments")
        connection.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS taskops_task_attachments (
                    id SERIAL PRIMARY KEY,
                    task_id INTEGER NOT NULL REFERENCES taskops_tasks(id) ON DELETE CASCADE,
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
                CREATE TABLE IF NOT EXISTS taskops_task_attachments (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    task_id INTEGER NOT NULL REFERENCES taskops_tasks(id) ON DELETE CASCADE,
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
        connection.execute(
            text(
                "CREATE INDEX IF NOT EXISTS ix_taskops_task_attachments_task_id ON taskops_task_attachments (task_id)"
            )
        )

    if "taskops_task_status_events" not in existing_tables:
        _drop_orphan_postgres_composite_type(connection, "taskops_task_status_events")
        connection.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS taskops_task_status_events (
                    id SERIAL PRIMARY KEY,
                    task_id INTEGER NOT NULL REFERENCES taskops_tasks(id) ON DELETE CASCADE,
                    event_type VARCHAR(60) NOT NULL,
                    from_status VARCHAR(40),
                    to_status VARCHAR(40),
                    summary VARCHAR(180),
                    notes TEXT,
                    created_by_user_id INTEGER,
                    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
                )
                """
                if is_postgres
                else """
                CREATE TABLE IF NOT EXISTS taskops_task_status_events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    task_id INTEGER NOT NULL REFERENCES taskops_tasks(id) ON DELETE CASCADE,
                    event_type VARCHAR(60) NOT NULL,
                    from_status VARCHAR(40),
                    to_status VARCHAR(40),
                    summary VARCHAR(180),
                    notes TEXT,
                    created_by_user_id INTEGER,
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
        )
        for index_name, column_name in (
            ("ix_taskops_task_status_events_task_id", "task_id"),
            ("ix_taskops_task_status_events_event_type", "event_type"),
            ("ix_taskops_task_status_events_from_status", "from_status"),
            ("ix_taskops_task_status_events_to_status", "to_status"),
            ("ix_taskops_task_status_events_created_at", "created_at"),
        ):
            connection.execute(
                text(
                    f"CREATE INDEX IF NOT EXISTS {index_name} ON taskops_task_status_events ({column_name})"
                )
            )
