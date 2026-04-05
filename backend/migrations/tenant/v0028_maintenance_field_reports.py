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
    func,
    inspect,
)

MIGRATION_ID = "0028_maintenance_field_reports"
DESCRIPTION = "Add maintenance field report checklist and evidences"

metadata = MetaData()

Table("maintenance_work_orders", metadata, Column("id", Integer, primary_key=True))

maintenance_work_order_checklist_items = Table(
    "maintenance_work_order_checklist_items",
    metadata,
    Column("id", Integer, primary_key=True),
    Column(
        "work_order_id",
        Integer,
        ForeignKey("maintenance_work_orders.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    ),
    Column("item_key", String(80), nullable=False, index=True),
    Column("label", String(180), nullable=False),
    Column("is_completed", Boolean, nullable=False, server_default="0", index=True),
    Column("notes", Text, nullable=True),
    Column("sort_order", Integer, nullable=False, server_default="0", index=True),
    Column("updated_by_user_id", Integer, nullable=True, index=True),
    Column("created_at", DateTime(timezone=True), nullable=False, server_default=func.now(), index=True),
    Column("updated_at", DateTime(timezone=True), nullable=False, server_default=func.now()),
)

maintenance_work_order_evidences = Table(
    "maintenance_work_order_evidences",
    metadata,
    Column("id", Integer, primary_key=True),
    Column(
        "work_order_id",
        Integer,
        ForeignKey("maintenance_work_orders.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    ),
    Column("file_name", String(255), nullable=False),
    Column("storage_key", String(255), nullable=False),
    Column("content_type", String(120), nullable=True),
    Column("file_size", Integer, nullable=False, server_default="0"),
    Column("notes", Text, nullable=True),
    Column("uploaded_by_user_id", Integer, nullable=True, index=True),
    Column("created_at", DateTime(timezone=True), nullable=False, server_default=func.now(), index=True),
)


def upgrade(connection) -> None:
    existing_tables = set(inspect(connection).get_table_names())
    if "maintenance_work_order_checklist_items" not in existing_tables:
        metadata.create_all(connection, tables=[maintenance_work_order_checklist_items], checkfirst=True)
    if "maintenance_work_order_evidences" not in existing_tables:
        metadata.create_all(connection, tables=[maintenance_work_order_evidences], checkfirst=True)


def downgrade(connection) -> None:
    # Sin downgrade por compatibilidad con sqlite y migraciones de prueba.
    pass