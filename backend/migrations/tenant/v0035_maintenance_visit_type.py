from sqlalchemy import inspect, text

MIGRATION_ID = "0035_maintenance_visit_type"
DESCRIPTION = "Add visit type to maintenance visits"


def upgrade(connection) -> None:
    inspector = inspect(connection)
    columns = {column["name"] for column in inspector.get_columns("maintenance_visits")}
    if "visit_type" not in columns:
        connection.execute(
            text(
                "ALTER TABLE maintenance_visits "
                "ADD COLUMN visit_type VARCHAR(40) NOT NULL DEFAULT 'execution'"
            )
        )


def downgrade(connection) -> None:
    return None