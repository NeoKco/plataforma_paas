from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    MetaData,
    String,
    Table,
    Text,
    UniqueConstraint,
    func,
    inspect,
    text,
)

MIGRATION_ID = "0021_maintenance_schedules_and_due_items"
DESCRIPTION = "Create maintenance schedules and due items"

metadata = MetaData()

Table("business_clients", metadata, Column("id", Integer, primary_key=True))
Table("business_sites", metadata, Column("id", Integer, primary_key=True))
Table("business_task_types", metadata, Column("id", Integer, primary_key=True))
Table("business_work_groups", metadata, Column("id", Integer, primary_key=True))
Table("maintenance_installations", metadata, Column("id", Integer, primary_key=True))
Table("maintenance_work_orders", metadata, Column("id", Integer, primary_key=True))

maintenance_schedules = Table(
    "maintenance_schedules",
    metadata,
    Column("id", Integer, primary_key=True),
    Column(
        "client_id",
        Integer,
        ForeignKey("business_clients.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    ),
    Column(
        "site_id",
        Integer,
        ForeignKey("business_sites.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    ),
    Column(
        "installation_id",
        Integer,
        ForeignKey("maintenance_installations.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    ),
    Column(
        "task_type_id",
        Integer,
        ForeignKey("business_task_types.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    ),
    Column("name", String(180), nullable=False, index=True),
    Column("description", Text, nullable=True),
    Column("frequency_value", Integer, nullable=False),
    Column("frequency_unit", String(20), nullable=False, server_default="months", index=True),
    Column("lead_days", Integer, nullable=False, server_default="30"),
    Column("start_mode", String(40), nullable=False, server_default="from_manual_due_date"),
    Column("base_date", DateTime(timezone=True), nullable=True),
    Column("last_executed_at", DateTime(timezone=True), nullable=True),
    Column("next_due_at", DateTime(timezone=True), nullable=False, index=True),
    Column("default_priority", String(30), nullable=False, server_default="normal", index=True),
    Column("estimated_duration_minutes", Integer, nullable=True),
    Column("billing_mode", String(30), nullable=False, server_default="per_work_order", index=True),
    Column("is_active", Boolean, nullable=False, server_default="1", index=True),
    Column("auto_create_due_items", Boolean, nullable=False, server_default="1"),
    Column("notes", Text, nullable=True),
    Column("created_by_user_id", Integer, nullable=True, index=True),
    Column("created_at", DateTime(timezone=True), nullable=False, server_default=func.now(), index=True),
    Column("updated_at", DateTime(timezone=True), nullable=False, server_default=func.now()),
)

maintenance_due_items = Table(
    "maintenance_due_items",
    metadata,
    Column("id", Integer, primary_key=True),
    Column(
        "schedule_id",
        Integer,
        ForeignKey("maintenance_schedules.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    ),
    Column(
        "client_id",
        Integer,
        ForeignKey("business_clients.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    ),
    Column(
        "site_id",
        Integer,
        ForeignKey("business_sites.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    ),
    Column(
        "installation_id",
        Integer,
        ForeignKey("maintenance_installations.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    ),
    Column("due_at", DateTime(timezone=True), nullable=False, index=True),
    Column("visible_from", DateTime(timezone=True), nullable=False, index=True),
    Column("due_status", String(30), nullable=False, server_default="upcoming", index=True),
    Column("contact_status", String(30), nullable=False, server_default="not_contacted", index=True),
    Column(
        "assigned_work_group_id",
        Integer,
        ForeignKey("business_work_groups.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    ),
    Column("assigned_tenant_user_id", Integer, nullable=True, index=True),
    Column(
        "work_order_id",
        Integer,
        ForeignKey("maintenance_work_orders.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    ),
    Column("postponed_until", DateTime(timezone=True), nullable=True, index=True),
    Column("contact_note", Text, nullable=True),
    Column("resolution_note", Text, nullable=True),
    Column("created_at", DateTime(timezone=True), nullable=False, server_default=func.now(), index=True),
    Column("updated_at", DateTime(timezone=True), nullable=False, server_default=func.now()),
    UniqueConstraint("schedule_id", "due_at", name="uq_maintenance_due_item_cycle"),
)


def _add_column_if_missing(connection, table_name: str, column_name: str, ddl: str) -> None:
    inspector = inspect(connection)
    columns = {column["name"] for column in inspector.get_columns(table_name)}
    if column_name not in columns:
        connection.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {ddl}"))


def upgrade(connection) -> None:
    inspector = inspect(connection)
    existing_tables = set(inspector.get_table_names())
    if "maintenance_schedules" not in existing_tables or "maintenance_due_items" not in existing_tables:
        metadata.create_all(
            connection,
            tables=[maintenance_schedules, maintenance_due_items],
            checkfirst=True,
        )

    _add_column_if_missing(connection, "maintenance_work_orders", "schedule_id", "schedule_id INTEGER")
    _add_column_if_missing(connection, "maintenance_work_orders", "due_item_id", "due_item_id INTEGER")
    _add_column_if_missing(
        connection,
        "maintenance_work_orders",
        "billing_mode",
        "billing_mode VARCHAR(30)",
    )


def downgrade(connection) -> None:
    # Sin downgrade por compatibilidad con sqlite y migraciones de prueba.
    pass
