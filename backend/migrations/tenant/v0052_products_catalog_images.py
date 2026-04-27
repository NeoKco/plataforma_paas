from sqlalchemy import inspect, text

MIGRATION_ID = "0052_products_catalog_images"
DESCRIPTION = "Add compressed catalog product images"


def _datetime_type(connection) -> str:
    return "TIMESTAMP WITH TIME ZONE" if connection.dialect.name == "postgresql" else "DATETIME"


def _boolean_default(connection, value: bool) -> str:
    if connection.dialect.name == "postgresql":
        return "TRUE" if value else "FALSE"
    return "1" if value else "0"


def upgrade(connection) -> None:
    inspector = inspect(connection)
    if "products_product_images" not in inspector.get_table_names():
        dt = _datetime_type(connection)
        connection.execute(
            text(
                f"""
                CREATE TABLE products_product_images (
                    id INTEGER PRIMARY KEY,
                    product_id INTEGER NOT NULL REFERENCES crm_products(id) ON DELETE CASCADE,
                    file_name VARCHAR(255) NOT NULL,
                    storage_key VARCHAR(255) NOT NULL UNIQUE,
                    content_type VARCHAR(120),
                    file_size INTEGER NOT NULL DEFAULT 0,
                    caption TEXT,
                    is_primary BOOLEAN NOT NULL DEFAULT {_boolean_default(connection, False)},
                    uploaded_by_user_id INTEGER,
                    created_at {dt} NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
        )
    connection.execute(
        text(
            "CREATE INDEX IF NOT EXISTS ix_products_product_images_product_id "
            "ON products_product_images (product_id)"
        )
    )
    connection.execute(
        text(
            "CREATE INDEX IF NOT EXISTS ix_products_product_images_is_primary "
            "ON products_product_images (is_primary)"
        )
    )
    connection.execute(
        text(
            "CREATE INDEX IF NOT EXISTS ix_products_product_images_created_at "
            "ON products_product_images (created_at)"
        )
    )


def downgrade(connection) -> None:
    return None
