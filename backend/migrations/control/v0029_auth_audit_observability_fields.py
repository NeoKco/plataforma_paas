from sqlalchemy import inspect, text

MIGRATION_ID = "0029_auth_audit_observability_fields"
DESCRIPTION = "Add request correlation fields to auth audit events"


def upgrade(connection) -> None:
    dialect = connection.dialect.name
    existing_columns = {
        column["name"] for column in inspect(connection).get_columns("auth_audit_events")
    }

    if dialect == "sqlite":
        if "request_id" not in existing_columns:
            connection.execute(
                text(
                    """
                    ALTER TABLE auth_audit_events
                    ADD COLUMN request_id VARCHAR(100)
                    """
                )
            )
        if "request_path" not in existing_columns:
            connection.execute(
                text(
                    """
                    ALTER TABLE auth_audit_events
                    ADD COLUMN request_path VARCHAR(255)
                    """
                )
            )
        if "request_method" not in existing_columns:
            connection.execute(
                text(
                    """
                    ALTER TABLE auth_audit_events
                    ADD COLUMN request_method VARCHAR(16)
                    """
                )
            )
        existing_columns.update({"request_id", "request_path", "request_method"})
        connection.execute(
            text(
                """
                CREATE INDEX IF NOT EXISTS ix_auth_audit_events_request_id
                ON auth_audit_events (request_id)
                """
            )
        )
        connection.execute(
            text(
                """
                CREATE INDEX IF NOT EXISTS ix_auth_audit_events_request_path
                ON auth_audit_events (request_path)
                """
            )
        )
        connection.execute(
            text(
                """
                CREATE INDEX IF NOT EXISTS ix_auth_audit_events_request_method
                ON auth_audit_events (request_method)
                """
            )
        )
        return

    if "request_id" not in existing_columns:
        connection.execute(
            text(
                """
                ALTER TABLE auth_audit_events
                ADD COLUMN IF NOT EXISTS request_id VARCHAR(100)
                """
            )
        )
    if "request_path" not in existing_columns:
        connection.execute(
            text(
                """
                ALTER TABLE auth_audit_events
                ADD COLUMN IF NOT EXISTS request_path VARCHAR(255)
                """
            )
        )
    if "request_method" not in existing_columns:
        connection.execute(
            text(
                """
                ALTER TABLE auth_audit_events
                ADD COLUMN IF NOT EXISTS request_method VARCHAR(16)
                """
            )
        )
    connection.execute(
        text(
            """
            CREATE INDEX IF NOT EXISTS ix_auth_audit_events_request_id
            ON auth_audit_events (request_id)
            """
        )
    )
    connection.execute(
        text(
            """
            CREATE INDEX IF NOT EXISTS ix_auth_audit_events_request_path
            ON auth_audit_events (request_path)
            """
        )
    )
    connection.execute(
        text(
            """
            CREATE INDEX IF NOT EXISTS ix_auth_audit_events_request_method
            ON auth_audit_events (request_method)
            """
        )
    )


def downgrade(connection) -> None:
    dialect = connection.dialect.name

    connection.execute(
        text("DROP INDEX IF EXISTS ix_auth_audit_events_request_method")
    )
    connection.execute(
        text("DROP INDEX IF EXISTS ix_auth_audit_events_request_path")
    )
    connection.execute(
        text("DROP INDEX IF EXISTS ix_auth_audit_events_request_id")
    )

    if dialect == "sqlite":
        return

    connection.execute(
        text(
            """
            ALTER TABLE auth_audit_events
            DROP COLUMN IF EXISTS request_method
            """
        )
    )
    connection.execute(
        text(
            """
            ALTER TABLE auth_audit_events
            DROP COLUMN IF EXISTS request_path
            """
        )
    )
    connection.execute(
        text(
            """
            ALTER TABLE auth_audit_events
            DROP COLUMN IF EXISTS request_id
            """
        )
    )
