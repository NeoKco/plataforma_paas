from sqlalchemy import inspect, text


MIGRATION_ID = "0016_tenant_billing_state"
DESCRIPTION = "Add tenant billing state columns"


def upgrade(connection) -> None:
    existing_columns = {
        column["name"] for column in inspect(connection).get_columns("tenants")
    }

    if "billing_status" not in existing_columns:
        connection.execute(
            text("ALTER TABLE tenants ADD COLUMN billing_status VARCHAR(50)")
        )
    if "billing_status_reason" not in existing_columns:
        connection.execute(
            text("ALTER TABLE tenants ADD COLUMN billing_status_reason VARCHAR(255)")
        )
    if "billing_current_period_ends_at" not in existing_columns:
        connection.execute(
            text(
                "ALTER TABLE tenants ADD COLUMN billing_current_period_ends_at TIMESTAMP WITH TIME ZONE"
            )
        )
    if "billing_grace_until" not in existing_columns:
        connection.execute(
            text(
                "ALTER TABLE tenants ADD COLUMN billing_grace_until TIMESTAMP WITH TIME ZONE"
            )
        )


def downgrade(connection) -> None:
    raise NotImplementedError("Downgrade is not supported")
