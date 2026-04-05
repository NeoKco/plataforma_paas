from sqlalchemy import (
    Boolean,
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
)

MIGRATION_ID = "0026_maintenance_cost_templates"
DESCRIPTION = "Add maintenance cost templates"

metadata = MetaData()

Table("business_task_types", metadata, Column("id", Integer, primary_key=True))
Table("maintenance_cost_templates", metadata, Column("id", Integer, primary_key=True))

maintenance_cost_templates = Table(
    "maintenance_cost_templates",
    metadata,
    Column("id", Integer, primary_key=True),
    Column(
        "task_type_id",
        Integer,
        ForeignKey("business_task_types.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    ),
    Column("name", String(160), nullable=False, index=True),
    Column("description", Text, nullable=True),
    Column("estimate_target_margin_percent", Float, nullable=False, server_default="0"),
    Column("estimate_notes", Text, nullable=True),
    Column("is_active", Boolean, nullable=False, server_default="1", index=True),
    Column("created_by_user_id", Integer, nullable=True, index=True),
    Column("updated_by_user_id", Integer, nullable=True, index=True),
    Column("created_at", DateTime(timezone=True), nullable=False, server_default=func.now(), index=True),
    Column("updated_at", DateTime(timezone=True), nullable=False, server_default=func.now()),
)

maintenance_cost_template_lines = Table(
    "maintenance_cost_template_lines",
    metadata,
    Column("id", Integer, primary_key=True),
    Column(
        "template_id",
        Integer,
        ForeignKey("maintenance_cost_templates.id", ondelete="CASCADE"),
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
    existing_tables = set(inspector.get_table_names())
    if "maintenance_cost_templates" not in existing_tables:
        metadata.create_all(connection, tables=[maintenance_cost_templates], checkfirst=True)
    if "maintenance_cost_template_lines" not in existing_tables:
        metadata.create_all(connection, tables=[maintenance_cost_template_lines], checkfirst=True)


def downgrade(connection) -> None:
    # Sin downgrade por compatibilidad con sqlite y migraciones de prueba.
    pass
