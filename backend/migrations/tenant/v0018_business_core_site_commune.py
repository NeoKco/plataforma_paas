from sqlalchemy import inspect, text

MIGRATION_ID = "0018_business_core_site_commune"
DESCRIPTION = "Add commune to business sites"


def upgrade(connection) -> None:
    inspector = inspect(connection)
    existing_columns = {column["name"] for column in inspector.get_columns("business_sites")}
    if "commune" not in existing_columns:
        connection.execute(text("ALTER TABLE business_sites ADD COLUMN commune VARCHAR(120)"))


def downgrade(connection) -> None:
    # Se deja sin downgrade porque las bases sqlite de prueba no soportan DROP COLUMN simple.
    pass
