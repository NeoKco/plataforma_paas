from sqlalchemy import MetaData, inspect, text

MIGRATION_ID = "0033_business_organization_addresses"
DESCRIPTION = "Add organization address fields"

metadata = MetaData()


def upgrade(connection) -> None:
    inspector = inspect(connection)
    existing_columns = {column["name"] for column in inspector.get_columns("business_organizations")}
    statements = []
    if "address_line" not in existing_columns:
        statements.append('ALTER TABLE business_organizations ADD COLUMN address_line VARCHAR(200)')
    if "commune" not in existing_columns:
        statements.append('ALTER TABLE business_organizations ADD COLUMN commune VARCHAR(120)')
    if "city" not in existing_columns:
        statements.append('ALTER TABLE business_organizations ADD COLUMN city VARCHAR(120)')
    if "region" not in existing_columns:
        statements.append('ALTER TABLE business_organizations ADD COLUMN region VARCHAR(120)')
    if "country_code" not in existing_columns:
        statements.append("ALTER TABLE business_organizations ADD COLUMN country_code VARCHAR(8) DEFAULT 'CL'")
    for statement in statements:
        connection.execute(text(statement))


def downgrade(connection) -> None:
    pass
