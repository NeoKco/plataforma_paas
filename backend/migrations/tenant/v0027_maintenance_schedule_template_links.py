from sqlalchemy import Column, Integer, MetaData, Table, inspect, text

MIGRATION_ID = "0027_maintenance_schedule_template_links"
DESCRIPTION = "Link maintenance schedules to cost templates"

metadata = MetaData()

Table("maintenance_schedules", metadata, Column("id", Integer, primary_key=True))


def upgrade(connection) -> None:
    inspector = inspect(connection)
    schedule_columns = {
        column["name"] for column in inspector.get_columns("maintenance_schedules")
    }
    if "cost_template_id" not in schedule_columns:
        connection.execute(
            text("ALTER TABLE maintenance_schedules ADD COLUMN cost_template_id INTEGER")
        )


def downgrade(connection) -> None:
    # Sin downgrade por compatibilidad con sqlite y migraciones de prueba.
    pass