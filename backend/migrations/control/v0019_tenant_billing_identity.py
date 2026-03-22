from sqlalchemy import inspect, text

MIGRATION_ID = "0019_tenant_billing_identity"
DESCRIPTION = "Add billing provider identity columns to tenants"


def upgrade(connection) -> None:
    existing_columns = {
        column["name"] for column in inspect(connection).get_columns("tenants")
    }

    if "billing_provider" not in existing_columns:
        connection.execute(
            text(
                "ALTER TABLE tenants "
                "ADD COLUMN billing_provider VARCHAR(50)"
            )
        )

    if "billing_provider_customer_id" not in existing_columns:
        connection.execute(
            text(
                "ALTER TABLE tenants "
                "ADD COLUMN billing_provider_customer_id VARCHAR(150)"
            )
        )

    if "billing_provider_subscription_id" not in existing_columns:
        connection.execute(
            text(
                "ALTER TABLE tenants "
                "ADD COLUMN billing_provider_subscription_id VARCHAR(150)"
            )
        )
