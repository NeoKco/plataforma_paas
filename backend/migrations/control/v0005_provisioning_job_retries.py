from sqlalchemy import inspect, text

MIGRATION_ID = "0005_provisioning_job_retries"
DESCRIPTION = "Add retry and scheduling fields to provisioning jobs"


def upgrade(connection) -> None:
    columns = {
        column["name"]
        for column in inspect(connection).get_columns("provisioning_jobs")
    }

    statements: list[str] = []
    if "attempts" not in columns:
        statements.append(
            "ALTER TABLE provisioning_jobs "
            "ADD COLUMN attempts INTEGER NOT NULL DEFAULT 0"
        )
    if "max_attempts" not in columns:
        statements.append(
            "ALTER TABLE provisioning_jobs "
            "ADD COLUMN max_attempts INTEGER NOT NULL DEFAULT 3"
        )
    if "last_attempt_at" not in columns:
        statements.append(
            "ALTER TABLE provisioning_jobs "
            "ADD COLUMN last_attempt_at TIMESTAMP NULL"
        )
    if "next_retry_at" not in columns:
        statements.append(
            "ALTER TABLE provisioning_jobs "
            "ADD COLUMN next_retry_at TIMESTAMP NULL"
        )

    for statement in statements:
        connection.execute(text(statement))
