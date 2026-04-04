from sqlalchemy import (
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    MetaData,
    Table,
    Text,
    func,
    inspect,
)

MIGRATION_ID = "0022_maintenance_costing_and_finance_sync"
DESCRIPTION = "Create maintenance costing tables and finance links"

metadata = MetaData()

Table("maintenance_work_orders", metadata, Column("id", Integer, primary_key=True))
Table("finance_transactions", metadata, Column("id", Integer, primary_key=True))

maintenance_cost_estimates = Table(
    "maintenance_cost_estimates",
    metadata,
    Column("id", Integer, primary_key=True),
    Column(
        "work_order_id",
        Integer,
        ForeignKey("maintenance_work_orders.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    ),
    Column("labor_cost", Float, nullable=False, server_default="0"),
    Column("travel_cost", Float, nullable=False, server_default="0"),
    Column("materials_cost", Float, nullable=False, server_default="0"),
    Column("external_services_cost", Float, nullable=False, server_default="0"),
    Column("overhead_cost", Float, nullable=False, server_default="0"),
    Column("total_estimated_cost", Float, nullable=False, server_default="0"),
    Column("target_margin_percent", Float, nullable=False, server_default="0"),
    Column("suggested_price", Float, nullable=False, server_default="0"),
    Column("notes", Text, nullable=True),
    Column("created_by_user_id", Integer, nullable=True, index=True),
    Column("updated_by_user_id", Integer, nullable=True, index=True),
    Column("created_at", DateTime(timezone=True), nullable=False, server_default=func.now(), index=True),
    Column("updated_at", DateTime(timezone=True), nullable=False, server_default=func.now()),
)

maintenance_cost_actuals = Table(
    "maintenance_cost_actuals",
    metadata,
    Column("id", Integer, primary_key=True),
    Column(
        "work_order_id",
        Integer,
        ForeignKey("maintenance_work_orders.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    ),
    Column("labor_cost", Float, nullable=False, server_default="0"),
    Column("travel_cost", Float, nullable=False, server_default="0"),
    Column("materials_cost", Float, nullable=False, server_default="0"),
    Column("external_services_cost", Float, nullable=False, server_default="0"),
    Column("overhead_cost", Float, nullable=False, server_default="0"),
    Column("total_actual_cost", Float, nullable=False, server_default="0"),
    Column("actual_price_charged", Float, nullable=False, server_default="0"),
    Column("actual_income", Float, nullable=False, server_default="0"),
    Column("actual_profit", Float, nullable=False, server_default="0"),
    Column("actual_margin_percent", Float, nullable=True),
    Column("notes", Text, nullable=True),
    Column(
        "income_transaction_id",
        Integer,
        ForeignKey("finance_transactions.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    ),
    Column(
        "expense_transaction_id",
        Integer,
        ForeignKey("finance_transactions.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    ),
    Column("finance_synced_at", DateTime(timezone=True), nullable=True, index=True),
    Column("created_by_user_id", Integer, nullable=True, index=True),
    Column("updated_by_user_id", Integer, nullable=True, index=True),
    Column("created_at", DateTime(timezone=True), nullable=False, server_default=func.now(), index=True),
    Column("updated_at", DateTime(timezone=True), nullable=False, server_default=func.now()),
)


def upgrade(connection) -> None:
    inspector = inspect(connection)
    existing_tables = set(inspector.get_table_names())
    if (
        "maintenance_cost_estimates" not in existing_tables
        or "maintenance_cost_actuals" not in existing_tables
    ):
        metadata.create_all(
            connection,
            tables=[maintenance_cost_estimates, maintenance_cost_actuals],
            checkfirst=True,
        )


def downgrade(connection) -> None:
    # Sin downgrade por compatibilidad con sqlite y migraciones de prueba.
    pass
