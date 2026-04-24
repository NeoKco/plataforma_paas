from sqlalchemy import inspect, text

MIGRATION_ID = "0044_chat_base"
DESCRIPTION = "Add internal chat module with conversations, participants and messages"


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

    if "chat_conversations" not in existing_tables:
        _drop_orphan_postgres_composite_type(connection, "chat_conversations")
        connection.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS chat_conversations (
                    id SERIAL PRIMARY KEY,
                    conversation_kind VARCHAR(30) NOT NULL DEFAULT 'direct',
                    context_type VARCHAR(30) NOT NULL DEFAULT 'general',
                    client_id INTEGER REFERENCES business_clients(id) ON DELETE SET NULL,
                    opportunity_id INTEGER REFERENCES crm_opportunities(id) ON DELETE SET NULL,
                    work_order_id INTEGER REFERENCES maintenance_work_orders(id) ON DELETE SET NULL,
                    task_id INTEGER REFERENCES taskops_tasks(id) ON DELETE SET NULL,
                    title VARCHAR(180),
                    description TEXT,
                    created_by_user_id INTEGER,
                    last_message_at TIMESTAMP WITH TIME ZONE,
                    is_active BOOLEAN NOT NULL DEFAULT TRUE,
                    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
                )
                """
                if is_postgres
                else """
                CREATE TABLE IF NOT EXISTS chat_conversations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    conversation_kind VARCHAR(30) NOT NULL DEFAULT 'direct',
                    context_type VARCHAR(30) NOT NULL DEFAULT 'general',
                    client_id INTEGER REFERENCES business_clients(id) ON DELETE SET NULL,
                    opportunity_id INTEGER REFERENCES crm_opportunities(id) ON DELETE SET NULL,
                    work_order_id INTEGER REFERENCES maintenance_work_orders(id) ON DELETE SET NULL,
                    task_id INTEGER REFERENCES taskops_tasks(id) ON DELETE SET NULL,
                    title VARCHAR(180),
                    description TEXT,
                    created_by_user_id INTEGER,
                    last_message_at DATETIME,
                    is_active BOOLEAN NOT NULL DEFAULT 1,
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
        )
        for index_name, column_name in (
            ("ix_chat_conversations_conversation_kind", "conversation_kind"),
            ("ix_chat_conversations_context_type", "context_type"),
            ("ix_chat_conversations_client_id", "client_id"),
            ("ix_chat_conversations_opportunity_id", "opportunity_id"),
            ("ix_chat_conversations_work_order_id", "work_order_id"),
            ("ix_chat_conversations_task_id", "task_id"),
            ("ix_chat_conversations_is_active", "is_active"),
            ("ix_chat_conversations_last_message_at", "last_message_at"),
            ("ix_chat_conversations_created_at", "created_at"),
            ("ix_chat_conversations_updated_at", "updated_at"),
        ):
            connection.execute(
                text(
                    f"CREATE INDEX IF NOT EXISTS {index_name} ON chat_conversations ({column_name})"
                )
            )

    if "chat_conversation_participants" not in existing_tables:
        _drop_orphan_postgres_composite_type(connection, "chat_conversation_participants")
        connection.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS chat_conversation_participants (
                    id SERIAL PRIMARY KEY,
                    conversation_id INTEGER NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
                    user_id INTEGER NOT NULL,
                    participant_role VARCHAR(30) NOT NULL DEFAULT 'member',
                    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
                    last_read_message_id INTEGER,
                    last_read_at TIMESTAMP WITH TIME ZONE,
                    joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                    CONSTRAINT uq_chat_conversation_participants_conversation_user UNIQUE (conversation_id, user_id)
                )
                """
                if is_postgres
                else """
                CREATE TABLE IF NOT EXISTS chat_conversation_participants (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    conversation_id INTEGER NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
                    user_id INTEGER NOT NULL,
                    participant_role VARCHAR(30) NOT NULL DEFAULT 'member',
                    is_archived BOOLEAN NOT NULL DEFAULT 0,
                    last_read_message_id INTEGER,
                    last_read_at DATETIME,
                    joined_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    CONSTRAINT uq_chat_conversation_participants_conversation_user UNIQUE (conversation_id, user_id)
                )
                """
            )
        )
        for index_name, column_name in (
            ("ix_chat_conversation_participants_conversation_id", "conversation_id"),
            ("ix_chat_conversation_participants_user_id", "user_id"),
            ("ix_chat_conversation_participants_is_archived", "is_archived"),
            ("ix_chat_conversation_participants_last_read_message_id", "last_read_message_id"),
            ("ix_chat_conversation_participants_last_read_at", "last_read_at"),
        ):
            connection.execute(
                text(
                    "CREATE INDEX IF NOT EXISTS "
                    f"{index_name} ON chat_conversation_participants ({column_name})"
                )
            )

    if "chat_messages" not in existing_tables:
        _drop_orphan_postgres_composite_type(connection, "chat_messages")
        connection.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS chat_messages (
                    id SERIAL PRIMARY KEY,
                    conversation_id INTEGER NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
                    sender_user_id INTEGER,
                    message_kind VARCHAR(30) NOT NULL DEFAULT 'text',
                    body TEXT NOT NULL,
                    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                    edited_at TIMESTAMP WITH TIME ZONE
                )
                """
                if is_postgres
                else """
                CREATE TABLE IF NOT EXISTS chat_messages (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    conversation_id INTEGER NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
                    sender_user_id INTEGER,
                    message_kind VARCHAR(30) NOT NULL DEFAULT 'text',
                    body TEXT NOT NULL,
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    edited_at DATETIME
                )
                """
            )
        )
        for index_name, column_name in (
            ("ix_chat_messages_conversation_id", "conversation_id"),
            ("ix_chat_messages_sender_user_id", "sender_user_id"),
            ("ix_chat_messages_message_kind", "message_kind"),
            ("ix_chat_messages_created_at", "created_at"),
        ):
            connection.execute(
                text(f"CREATE INDEX IF NOT EXISTS {index_name} ON chat_messages ({column_name})")
            )


def downgrade(connection) -> None:
    raise RuntimeError("Tenant migrations are forward-only in platform_paas")
