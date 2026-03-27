from sqlalchemy import inspect, text
from sqlalchemy.engine import Connection


MIGRATION_ID = "0010_finance_loan_installment_reversal_reason"
DESCRIPTION = "add structured reversal reason to finance loan installments"


def upgrade(connection: Connection) -> None:
    existing_columns = {
        column["name"]
        for column in inspect(connection).get_columns("finance_loan_installments")
    }
    if "reversal_reason_code" not in existing_columns:
        connection.execute(
            text(
                "ALTER TABLE finance_loan_installments ADD COLUMN reversal_reason_code VARCHAR(64)"
            )
        )
