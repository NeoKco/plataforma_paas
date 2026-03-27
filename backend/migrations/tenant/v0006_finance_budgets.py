from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    MetaData,
    Table,
    Text,
    func,
)

MIGRATION_ID = "0006_finance_budgets"
DESCRIPTION = "Create finance budgets table"

metadata = MetaData()

finance_categories = Table(
    "finance_categories",
    metadata,
    Column("id", Integer, primary_key=True),
)

finance_budgets = Table(
    "finance_budgets",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("period_month", Date, nullable=False),
    Column("category_id", Integer, ForeignKey("finance_categories.id"), nullable=False),
    Column("amount", Float, nullable=False),
    Column("note", Text, nullable=True),
    Column("is_active", Boolean, nullable=False, server_default="1"),
    Column("created_at", DateTime(timezone=True), nullable=False, server_default=func.now()),
    Column("updated_at", DateTime(timezone=True), nullable=False, server_default=func.now()),
    CheckConstraint("amount > 0", name="chk_finance_budgets_amount_positive"),
)

Index("idx_finance_budgets_period_month", finance_budgets.c.period_month)
Index("idx_finance_budgets_category_id", finance_budgets.c.category_id)
Index("idx_finance_budgets_is_active", finance_budgets.c.is_active)
Index(
    "uq_finance_budgets_period_category",
    finance_budgets.c.period_month,
    finance_budgets.c.category_id,
    unique=True,
)


def upgrade(connection) -> None:
    metadata.create_all(bind=connection, checkfirst=True)
