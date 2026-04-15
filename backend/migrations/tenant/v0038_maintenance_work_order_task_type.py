from sqlalchemy import inspect, text

MIGRATION_ID = "0038_maintenance_work_order_task_type"
DESCRIPTION = "Add task_type_id to maintenance work orders"


def upgrade(connection) -> None:
    inspector = inspect(connection)
    columns = {column["name"] for column in inspector.get_columns("maintenance_work_orders")}
    if "task_type_id" in columns:
        return
    connection.execute(
        text(
            "ALTER TABLE maintenance_work_orders "
            "ADD COLUMN task_type_id INTEGER"
        )
    )


def downgrade(connection) -> None:
    return None
