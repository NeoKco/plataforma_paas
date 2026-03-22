from sqlalchemy import inspect, text

MIGRATION_ID = "0012_provisioning_operational_alert_error_code"
DESCRIPTION = "Add error_code field to provisioning operational alerts"


def upgrade(connection) -> None:
    columns = {
        column["name"]
        for column in inspect(connection).get_columns("provisioning_operational_alerts")
    }

    if "error_code" not in columns:
        connection.execute(
            text(
                "ALTER TABLE provisioning_operational_alerts "
                "ADD COLUMN error_code VARCHAR(100) NULL"
            )
        )
