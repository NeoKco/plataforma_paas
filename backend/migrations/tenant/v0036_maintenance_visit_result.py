from sqlalchemy import inspect, text

MIGRATION_ID = "0036_maintenance_visit_result"
DESCRIPTION = "Add operational result to maintenance visits"


def upgrade(connection) -> None:
    inspector = inspect(connection)
    columns = {column["name"] for column in inspector.get_columns("maintenance_visits")}
    if "visit_result" not in columns:
        connection.execute(
            text(
                "ALTER TABLE maintenance_visits "
                "ADD COLUMN visit_result VARCHAR(40)"
            )
        )


def downgrade(connection) -> None:
    return None