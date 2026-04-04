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
)

MIGRATION_ID = "0023_maintenance_cost_lines"
DESCRIPTION = "Create maintenance cost lines table"

metadata = MetaData()

Table("maintenance_work_orders", metadata, Column("id", Integer, primary_key=True))
Table("finance_transactions", metadata, Column("id", Integer, primary_key=True))

maintenance_cost_lines = Table(
    "maintenance_cost_lines",
    metadata,
    Column("id", Integer, primary_key=True),
    Column(
        "work_order_id",
        Integer,
        ForeignKey("maintenance_work_orders.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    ),
    Column("cost_stage", String(20), nullable=False, index=True),
    Column("line_type", String(30), nullable=False, index=True),
    Column("description", String(180), nullable=True),
    Column("quantity", Float, nullable=False, server_default="1"),
    Column("unit_cost", Float, nullable=False, server_default="0"),
    Column("total_cost", Float, nullable=False, server_default="0"),
    Column(
        "finance_transaction_id",
        Integer,
        ForeignKey("finance_transactions.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    ),
    Column("notes", Text, nullable=True),
    Column("created_by_user_id", Integer, nullable=True, index=True),
    Column("updated_by_user_id", Integer, nullable=True, index=True),
    Column("created_at", DateTime(timezone=True), nullable=False, server_default=func.now(), index=True),
    Column("updated_at", DateTime(timezone=True), nullable=False, server_default=func.now()),
)


def upgrade(connection) -> None:
    inspector = inspect(connection)
    existing_tables = set(inspector.get_table_names())
    if "maintenance_cost_lines" not in existing_tables:
        metadata.create_all(
            connection,
            tables=[maintenance_cost_lines],
            checkfirst=True,
        )


def downgrade(connection) -> None:
    # Sin downgrade por compatibilidad con sqlite y migraciones de prueba.
    pass
