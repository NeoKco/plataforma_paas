from sqlalchemy import inspect, text
from sqlalchemy.engine import Connection


MIGRATION_ID = "0013_finance_transaction_voids_repair"
DESCRIPTION = "Repair missing soft-void fields on finance transactions"


def upgrade(connection: Connection) -> None:
    existing_columns = {
        column["name"]
        for column in inspect(connection).get_columns("finance_transactions")
    }

    if "is_voided" not in existing_columns:
        connection.execute(
            text(
                "ALTER TABLE finance_transactions "
                "ADD COLUMN is_voided BOOLEAN NOT NULL DEFAULT FALSE"
            )
        )
    if "voided_at" not in existing_columns:
        connection.execute(
            text(
                "ALTER TABLE finance_transactions "
                "ADD COLUMN voided_at TIMESTAMP NULL"
            )
        )
    if "void_reason" not in existing_columns:
        connection.execute(
            text(
                "ALTER TABLE finance_transactions "
                "ADD COLUMN void_reason TEXT NULL"
            )
        )
    if "voided_by_user_id" not in existing_columns:
        connection.execute(
            text(
                "ALTER TABLE finance_transactions "
                "ADD COLUMN voided_by_user_id INTEGER NULL"
            )
        )
