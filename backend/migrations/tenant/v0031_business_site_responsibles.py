from sqlalchemy import Column, DateTime, ForeignKey, Integer, MetaData, String, Table, Text, Boolean, UniqueConstraint, func, inspect

MIGRATION_ID = "0031_business_site_responsibles"
DESCRIPTION = "Create business site responsibles table"

metadata = MetaData()

business_sites = Table(
    "business_sites",
    metadata,
    Column("id", Integer, primary_key=True),
)

users = Table(
    "users",
    metadata,
    Column("id", Integer, primary_key=True),
)

business_site_responsibles = Table(
    "business_site_responsibles",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("site_id", Integer, ForeignKey("business_sites.id", ondelete="CASCADE"), nullable=False, index=True),
    Column("tenant_user_id", Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
    Column("responsibility_kind", String(60), nullable=False, server_default="primary", index=True),
    Column("is_primary", Boolean, nullable=False, server_default="0", index=True),
    Column("is_active", Boolean, nullable=False, server_default="1", index=True),
    Column("starts_at", DateTime(timezone=True), nullable=True),
    Column("ends_at", DateTime(timezone=True), nullable=True),
    Column("notes", Text, nullable=True),
    Column("created_at", DateTime(timezone=True), nullable=False, server_default=func.now(), index=True),
    Column("updated_at", DateTime(timezone=True), nullable=False, server_default=func.now()),
    UniqueConstraint("site_id", "tenant_user_id", name="uq_business_site_responsible"),
)


def upgrade(connection) -> None:
    existing_tables = set(inspect(connection).get_table_names())
    if "business_site_responsibles" not in existing_tables:
        metadata.create_all(connection, tables=[business_site_responsibles], checkfirst=True)


def downgrade(connection) -> None:
    # Sin downgrade por compatibilidad con sqlite y migraciones de prueba.
    pass
