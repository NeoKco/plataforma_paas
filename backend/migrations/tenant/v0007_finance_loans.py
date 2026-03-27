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
    String,
    func,
)

MIGRATION_ID = "0007_finance_loans"
DESCRIPTION = "Create finance loans table"

metadata = MetaData()

finance_currencies = Table(
    "finance_currencies",
    metadata,
    Column("id", Integer, primary_key=True),
)

finance_loans = Table(
    "finance_loans",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("name", String(150), nullable=False),
    Column("loan_type", String(20), nullable=False),
    Column("counterparty_name", String(150), nullable=False),
    Column("currency_id", Integer, ForeignKey("finance_currencies.id"), nullable=False),
    Column("principal_amount", Float, nullable=False),
    Column("current_balance", Float, nullable=False),
    Column("interest_rate", Float, nullable=True),
    Column("start_date", Date, nullable=False),
    Column("due_date", Date, nullable=True),
    Column("note", Text, nullable=True),
    Column("is_active", Boolean, nullable=False, server_default="1"),
    Column("created_at", DateTime(timezone=True), nullable=False, server_default=func.now()),
    Column("updated_at", DateTime(timezone=True), nullable=False, server_default=func.now()),
    CheckConstraint("principal_amount > 0", name="chk_finance_loans_principal_positive"),
    CheckConstraint("current_balance >= 0", name="chk_finance_loans_balance_non_negative"),
    CheckConstraint(
        "interest_rate IS NULL OR interest_rate >= 0",
        name="chk_finance_loans_interest_non_negative",
    ),
)

Index("idx_finance_loans_loan_type", finance_loans.c.loan_type)
Index("idx_finance_loans_counterparty_name", finance_loans.c.counterparty_name)
Index("idx_finance_loans_currency_id", finance_loans.c.currency_id)
Index("idx_finance_loans_start_date", finance_loans.c.start_date)
Index("idx_finance_loans_is_active", finance_loans.c.is_active)


def upgrade(connection) -> None:
    metadata.create_all(bind=connection, checkfirst=True)
