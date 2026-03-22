from sqlalchemy import inspect, text

MIGRATION_ID = "0013_tenant_rate_limit_overrides"
DESCRIPTION = "Add per-tenant API rate limit override fields"


def upgrade(connection) -> None:
    columns = {
        column["name"] for column in inspect(connection).get_columns("tenants")
    }

    if "api_read_requests_per_minute" not in columns:
        connection.execute(
            text(
                "ALTER TABLE tenants "
                "ADD COLUMN api_read_requests_per_minute INTEGER NULL"
            )
        )

    if "api_write_requests_per_minute" not in columns:
        connection.execute(
            text(
                "ALTER TABLE tenants "
                "ADD COLUMN api_write_requests_per_minute INTEGER NULL"
            )
        )
