from sqlalchemy import inspect, text

MIGRATION_ID = "0011_provisioning_job_error_code"
DESCRIPTION = "Add stable error code field to provisioning jobs"


def upgrade(connection) -> None:
    columns = {
        column["name"]
        for column in inspect(connection).get_columns("provisioning_jobs")
    }

    if "error_code" not in columns:
        connection.execute(
            text(
                "ALTER TABLE provisioning_jobs "
                "ADD COLUMN error_code VARCHAR(100) NULL"
            )
        )
