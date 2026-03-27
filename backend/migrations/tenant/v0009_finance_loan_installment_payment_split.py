from sqlalchemy import inspect

MIGRATION_ID = "0009_finance_loan_installment_payment_split"
DESCRIPTION = "Add payment split tracking for loan installments"


def upgrade(connection) -> None:
    existing_columns = {
        column["name"]
        for column in inspect(connection).get_columns("finance_loan_installments")
    }

    if "paid_principal_amount" not in existing_columns:
        connection.exec_driver_sql(
            "ALTER TABLE finance_loan_installments ADD COLUMN paid_principal_amount FLOAT DEFAULT 0"
        )
        connection.exec_driver_sql(
            "UPDATE finance_loan_installments SET paid_principal_amount = 0 WHERE paid_principal_amount IS NULL"
        )

    if "paid_interest_amount" not in existing_columns:
        connection.exec_driver_sql(
            "ALTER TABLE finance_loan_installments ADD COLUMN paid_interest_amount FLOAT DEFAULT 0"
        )
        connection.exec_driver_sql(
            "UPDATE finance_loan_installments SET paid_interest_amount = 0 WHERE paid_interest_amount IS NULL"
        )
