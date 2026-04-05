from sqlalchemy import (
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    MetaData,
    String,
    Table,
    Text,
    func,
    inspect,
    text,
)

MIGRATION_ID = "0025_maintenance_schedule_estimate_defaults"
DESCRIPTION = "Add estimate defaults to maintenance schedules"

metadata = MetaData()

Table("maintenance_schedules", metadata, Column("id", Integer, primary_key=True))

maintenance_schedule_cost_lines = Table(
    "maintenance_schedule_cost_lines",
    metadata,
    Column("id", Integer, primary_key=True),
    Column(
        "schedule_id",
        Integer,
        ForeignKey("maintenance_schedules.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    ),
    Column("line_type", String(30), nullable=False, index=True),
    Column("description", String(180), nullable=True),
    Column("quantity", Float, nullable=False, server_default="1"),
    Column("unit_cost", Float, nullable=False, server_default="0"),
    Column("total_cost", Float, nullable=False, server_default="0"),
    Column("sort_order", Integer, nullable=False, server_default="0", index=True),
    Column("notes", Text, nullable=True),
    Column("created_by_user_id", Integer, nullable=True, index=True),
    Column("updated_by_user_id", Integer, nullable=True, index=True),
    Column("created_at", DateTime(timezone=True), nullable=False, server_default=func.now(), index=True),
    Column("updated_at", DateTime(timezone=True), nullable=False, server_default=func.now()),
)


def upgrade(connection) -> None:
    inspector = inspect(connection)
    schedule_columns = {column["name"] for column in inspector.get_columns("maintenance_schedules")}

    if "estimate_target_margin_percent" not in schedule_columns:
        connection.execute(
            text(
                "ALTER TABLE maintenance_schedules ADD COLUMN estimate_target_margin_percent FLOAT NOT NULL DEFAULT 0"
            )
        )
    if "estimate_notes" not in schedule_columns:
        connection.execute(
            text("ALTER TABLE maintenance_schedules ADD COLUMN estimate_notes TEXT")
        )

    existing_tables = set(inspector.get_table_names())
    if "maintenance_schedule_cost_lines" not in existing_tables:
        metadata.create_all(connection, tables=[maintenance_schedule_cost_lines], checkfirst=True)


def downgrade(connection) -> None:
    # Sin downgrade por compatibilidad con sqlite y migraciones de prueba.
    pass