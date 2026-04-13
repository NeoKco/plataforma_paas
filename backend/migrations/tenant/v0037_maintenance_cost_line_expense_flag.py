from sqlalchemy import inspect, text

MIGRATION_ID = "0037_maintenance_cost_line_expense_flag"
DESCRIPTION = "Add include_in_expense flag to maintenance cost lines"

def upgrade(connection) -> None:
    inspector = inspect(connection)
    columns = {col["name"] for col in inspector.get_columns("maintenance_cost_lines")}
    if "include_in_expense" in columns:
        return
    connection.execute(
        text(
            "ALTER TABLE maintenance_cost_lines "
            "ADD COLUMN include_in_expense BOOLEAN NOT NULL DEFAULT true"
        )
    )


def downgrade(connection) -> None:
    pass
