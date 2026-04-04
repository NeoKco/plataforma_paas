from sqlalchemy import inspect, text

MIGRATION_ID = "0024_maintenance_finance_sync_policy"
DESCRIPTION = "Add tenant maintenance-finance sync policy fields"


def upgrade(connection) -> None:
    inspector = inspect(connection)
    tenant_info_columns = {column["name"] for column in inspector.get_columns("tenant_info")}

    if "maintenance_finance_sync_mode" not in tenant_info_columns:
        connection.execute(
            text(
                "ALTER TABLE tenant_info ADD COLUMN maintenance_finance_sync_mode "
                "VARCHAR(30) NOT NULL DEFAULT 'manual'"
            )
        )
    if "maintenance_finance_auto_sync_income" not in tenant_info_columns:
        connection.execute(
            text(
                "ALTER TABLE tenant_info ADD COLUMN maintenance_finance_auto_sync_income "
                "BOOLEAN NOT NULL DEFAULT true"
            )
        )
    if "maintenance_finance_auto_sync_expense" not in tenant_info_columns:
        connection.execute(
            text(
                "ALTER TABLE tenant_info ADD COLUMN maintenance_finance_auto_sync_expense "
                "BOOLEAN NOT NULL DEFAULT true"
            )
        )
    if "maintenance_finance_income_account_id" not in tenant_info_columns:
        connection.execute(
            text(
                "ALTER TABLE tenant_info ADD COLUMN maintenance_finance_income_account_id INTEGER"
            )
        )
    if "maintenance_finance_expense_account_id" not in tenant_info_columns:
        connection.execute(
            text(
                "ALTER TABLE tenant_info ADD COLUMN maintenance_finance_expense_account_id INTEGER"
            )
        )
    if "maintenance_finance_income_category_id" not in tenant_info_columns:
        connection.execute(
            text(
                "ALTER TABLE tenant_info ADD COLUMN maintenance_finance_income_category_id INTEGER"
            )
        )
    if "maintenance_finance_expense_category_id" not in tenant_info_columns:
        connection.execute(
            text(
                "ALTER TABLE tenant_info ADD COLUMN maintenance_finance_expense_category_id INTEGER"
            )
        )
    if "maintenance_finance_currency_id" not in tenant_info_columns:
        connection.execute(
            text(
                "ALTER TABLE tenant_info ADD COLUMN maintenance_finance_currency_id INTEGER"
            )
        )

    connection.execute(
        text(
            "UPDATE tenant_info "
            "SET maintenance_finance_sync_mode = 'manual' "
            "WHERE maintenance_finance_sync_mode IS NULL "
            "OR TRIM(maintenance_finance_sync_mode) = ''"
        )
    )


def downgrade(connection) -> None:
    # Sin downgrade por compatibilidad con sqlite y migraciones de prueba.
    pass
