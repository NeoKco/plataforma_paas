from sqlalchemy import (
    CheckConstraint,
    Column,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    MetaData,
    String,
    Table,
    Text,
    func,
    inspect,
)

MIGRATION_ID = "0008_finance_loan_installments"
DESCRIPTION = "Add loan schedule fields and installments table"

metadata = MetaData()

finance_loans = Table(
    "finance_loans",
    metadata,
    Column("id", Integer, primary_key=True),
)

finance_loan_installments = Table(
    "finance_loan_installments",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("loan_id", Integer, ForeignKey("finance_loans.id"), nullable=False),
    Column("installment_number", Integer, nullable=False),
    Column("due_date", Date, nullable=False),
    Column("planned_amount", Float, nullable=False),
    Column("principal_amount", Float, nullable=False, server_default="0"),
    Column("interest_amount", Float, nullable=False, server_default="0"),
    Column("paid_amount", Float, nullable=False, server_default="0"),
    Column("paid_at", Date, nullable=True),
    Column("note", Text, nullable=True),
    Column("created_at", DateTime(timezone=True), nullable=False, server_default=func.now()),
    Column("updated_at", DateTime(timezone=True), nullable=False, server_default=func.now()),
    CheckConstraint(
        "installment_number > 0",
        name="chk_finance_loan_installments_number_positive",
    ),
    CheckConstraint(
        "planned_amount > 0",
        name="chk_finance_loan_installments_planned_positive",
    ),
    CheckConstraint(
        "principal_amount >= 0",
        name="chk_finance_loan_installments_principal_non_negative",
    ),
    CheckConstraint(
        "interest_amount >= 0",
        name="chk_finance_loan_installments_interest_non_negative",
    ),
    CheckConstraint(
        "paid_amount >= 0",
        name="chk_finance_loan_installments_paid_non_negative",
    ),
)

Index("idx_finance_loan_installments_loan_id", finance_loan_installments.c.loan_id)
Index(
    "idx_finance_loan_installments_installment_number",
    finance_loan_installments.c.installment_number,
)
Index("idx_finance_loan_installments_due_date", finance_loan_installments.c.due_date)


def upgrade(connection) -> None:
    existing_columns = {
        column["name"] for column in inspect(connection).get_columns("finance_loans")
    }

    if "installments_count" not in existing_columns:
        connection.exec_driver_sql(
            "ALTER TABLE finance_loans ADD COLUMN installments_count INTEGER"
        )
    if "payment_frequency" not in existing_columns:
        connection.exec_driver_sql(
            "ALTER TABLE finance_loans ADD COLUMN payment_frequency VARCHAR(20) DEFAULT 'monthly'"
        )
        connection.exec_driver_sql(
            "UPDATE finance_loans SET payment_frequency = 'monthly' WHERE payment_frequency IS NULL"
        )

    metadata.create_all(bind=connection, checkfirst=True)
