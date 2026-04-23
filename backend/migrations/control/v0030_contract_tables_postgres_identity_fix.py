from sqlalchemy import inspect, text


MIGRATION_ID = "0030_contract_tables_postgres_identity_fix"
DESCRIPTION = "Repair PostgreSQL id defaults for contract and runtime secret tables"


TABLES = (
    "tenant_base_plan_catalog",
    "tenant_module_catalog",
    "tenant_module_price_catalog",
    "tenant_subscriptions",
    "tenant_subscription_items",
    "tenant_runtime_secret_campaigns",
    "tenant_runtime_secret_campaign_items",
)


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

    max_id = connection.execute(
        text(f"SELECT COALESCE(MAX(id), 0) AS max_id FROM {table_name}")
    ).mappings().first()
    current_max = int((max_id or {}).get("max_id") or 0)

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

    connection.execute(
        text(
            f"ALTER SEQUENCE {sequence_name} OWNED BY {table_name}.id"
        )
    )
    connection.execute(
        text(
            f"ALTER TABLE {table_name} ALTER COLUMN id SET DEFAULT nextval('{sequence_name}')"
        )
    )


def upgrade(connection) -> None:
    if connection.dialect.name != "postgresql":
        return

    inspector = inspect(connection)
    existing_tables = set(inspector.get_table_names())

    for table_name in TABLES:
        if table_name not in existing_tables:
            continue
        _ensure_postgres_id_default(connection, table_name)
