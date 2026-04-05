from sqlalchemy import Column, DateTime, Integer, MetaData, String, Table, Text, func, inspect

MIGRATION_ID = "0030_business_core_merge_audits"
DESCRIPTION = "Create business core merge audit ledger"

metadata = MetaData()

business_core_merge_audits = Table(
    "business_core_merge_audits",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("entity_kind", String(40), nullable=False, index=True),
    Column("entity_id", Integer, nullable=False, index=True),
    Column("summary", String(255), nullable=False),
    Column("payload_json", Text, nullable=True),
    Column("requested_by_user_id", Integer, nullable=True, index=True),
    Column("requested_by_email", String(150), nullable=True, index=True),
    Column("requested_by_role", String(80), nullable=True, index=True),
    Column("created_at", DateTime(timezone=True), nullable=False, server_default=func.now(), index=True),
)


def upgrade(connection) -> None:
    existing_tables = set(inspect(connection).get_table_names())
    if "business_core_merge_audits" not in existing_tables:
        metadata.create_all(connection, tables=[business_core_merge_audits], checkfirst=True)


def downgrade(connection) -> None:
    # Sin downgrade para compatibilidad con sqlite y migraciones de prueba.
    pass
