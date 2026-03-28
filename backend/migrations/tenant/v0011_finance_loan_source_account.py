from sqlalchemy import inspect, text
from sqlalchemy.engine import Connection


MIGRATION_ID = "0011_finance_loan_source_account"
DESCRIPTION = "add source account to finance loans"


def upgrade(connection: Connection) -> None:
    existing_columns = {
        column["name"]
        for column in inspect(connection).get_columns("finance_loans")
    }
    if "account_id" not in existing_columns:
        connection.execute(
            text(
                "ALTER TABLE finance_loans "
                "ADD COLUMN account_id INTEGER REFERENCES finance_accounts(id)"
            )
        )
