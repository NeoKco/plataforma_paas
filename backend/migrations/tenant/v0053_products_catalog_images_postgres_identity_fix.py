from sqlalchemy import inspect, text


MIGRATION_ID = "0053_products_catalog_images_postgres_identity_fix"
DESCRIPTION = "Repair PostgreSQL id default for products_product_images"


def _ensure_postgres_id_default(connection, table_name: str) -> None:
    default_row = connection.execute(
        text(
            """
            SELECT column_default
            FROM information_schema.columns
            WHERE table_schema = CURRENT_SCHEMA()
              AND table_name = :table_name
              AND column_name = 'id'
            """
        ),
        {"table_name": table_name},
    ).mappings().first()
    if default_row and str(default_row.get("column_default") or "").startswith("nextval("):
        return

    sequence_name = f"{table_name}_id_seq"
    connection.execute(text(f"CREATE SEQUENCE IF NOT EXISTS {sequence_name}"))

    max_row = connection.execute(
        text(f"SELECT COALESCE(MAX(id), 0) AS max_id FROM {table_name}")
    ).mappings().first()
    current_max = int((max_row or {}).get("max_id") or 0)

    if current_max <= 0:
        connection.execute(
            text("SELECT setval(:sequence_name, 1, false)"),
            {"sequence_name": sequence_name},
        )
    else:
        connection.execute(
            text("SELECT setval(:sequence_name, :current_max, true)"),
            {
                "sequence_name": sequence_name,
                "current_max": current_max,
            },
        )

    connection.execute(text(f"ALTER SEQUENCE {sequence_name} OWNED BY {table_name}.id"))
    connection.execute(
        text(
            f"ALTER TABLE {table_name} ALTER COLUMN id SET DEFAULT nextval('{sequence_name}')"
        )
    )


def upgrade(connection) -> None:
    if connection.dialect.name != "postgresql":
        return

    inspector = inspect(connection)
    if "products_product_images" not in inspector.get_table_names():
        return

    _ensure_postgres_id_default(connection, "products_product_images")


def downgrade(connection) -> None:
    return None
