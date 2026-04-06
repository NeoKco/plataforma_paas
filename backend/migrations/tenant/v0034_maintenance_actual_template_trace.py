from sqlalchemy import inspect, text

MIGRATION_ID = "0034_maintenance_actual_template_trace"
DESCRIPTION = "Add applied template trace to maintenance actual cost"


def upgrade(connection) -> None:
    inspector = inspect(connection)
    columns = {column["name"] for column in inspector.get_columns("maintenance_cost_actuals")}
    if "applied_cost_template_id" not in columns:
        connection.execute(text("ALTER TABLE maintenance_cost_actuals ADD COLUMN applied_cost_template_id INTEGER"))
    if "applied_cost_template_name_snapshot" not in columns:
        connection.execute(
            text(
                "ALTER TABLE maintenance_cost_actuals "
                "ADD COLUMN applied_cost_template_name_snapshot VARCHAR(160)"
            )
        )


def downgrade(connection) -> None:
    # Mantener simple por compatibilidad con sqlite en tests.
    return None