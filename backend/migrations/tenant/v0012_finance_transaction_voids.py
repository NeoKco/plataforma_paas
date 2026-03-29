from sqlalchemy import Boolean, Column, DateTime, Integer, MetaData, Table, Text

MIGRATION_ID = "0012_finance_transaction_voids"
DESCRIPTION = "Add soft-void fields to finance transactions"

metadata = MetaData()

finance_transactions = Table(
    "finance_transactions",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("is_voided", Boolean, nullable=False, server_default="0", index=True),
    Column("voided_at", DateTime(timezone=True), nullable=True, index=True),
    Column("void_reason", Text, nullable=True),
    Column("voided_by_user_id", Integer, nullable=True),
)


def upgrade(connection) -> None:
    metadata.create_all(bind=connection, checkfirst=True)
