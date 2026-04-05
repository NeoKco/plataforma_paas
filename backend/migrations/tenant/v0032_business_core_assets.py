from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, MetaData, String, Table, Text, UniqueConstraint, func, inspect

MIGRATION_ID = "0032_business_core_assets"
DESCRIPTION = "Create business core assets and asset types"

metadata = MetaData()

business_sites = Table(
    "business_sites",
    metadata,
    Column("id", Integer, primary_key=True),
)

business_asset_types = Table(
    "business_asset_types",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("code", String(60), nullable=True, unique=True, index=True),
    Column("name", String(150), nullable=False, unique=True, index=True),
    Column("description", Text, nullable=True),
    Column("is_active", Boolean, nullable=False, server_default="1", index=True),
    Column("sort_order", Integer, nullable=False, server_default="100", index=True),
    Column("created_at", DateTime(timezone=True), nullable=False, server_default=func.now(), index=True),
    Column("updated_at", DateTime(timezone=True), nullable=False, server_default=func.now()),
)

business_assets = Table(
    "business_assets",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("site_id", Integer, ForeignKey("business_sites.id", ondelete="CASCADE"), nullable=False, index=True),
    Column("asset_type_id", Integer, ForeignKey("business_asset_types.id", ondelete="RESTRICT"), nullable=False, index=True),
    Column("name", String(150), nullable=False, index=True),
    Column("asset_code", String(60), nullable=True, unique=True, index=True),
    Column("serial_number", String(120), nullable=True, index=True),
    Column("manufacturer", String(120), nullable=True),
    Column("model", String(120), nullable=True),
    Column("asset_status", String(40), nullable=False, server_default="active", index=True),
    Column("installed_at", DateTime(timezone=True), nullable=True),
    Column("last_service_at", DateTime(timezone=True), nullable=True),
    Column("warranty_until", DateTime(timezone=True), nullable=True),
    Column("location_note", Text, nullable=True),
    Column("technical_notes", Text, nullable=True),
    Column("is_active", Boolean, nullable=False, server_default="1", index=True),
    Column("sort_order", Integer, nullable=False, server_default="100", index=True),
    Column("created_at", DateTime(timezone=True), nullable=False, server_default=func.now(), index=True),
    Column("updated_at", DateTime(timezone=True), nullable=False, server_default=func.now()),
    UniqueConstraint("site_id", "name", name="uq_business_asset_site_name"),
)


def upgrade(connection) -> None:
    existing_tables = set(inspect(connection).get_table_names())
    if "business_asset_types" not in existing_tables:
        metadata.create_all(connection, tables=[business_asset_types], checkfirst=True)
    if "business_assets" not in existing_tables:
        metadata.create_all(connection, tables=[business_assets], checkfirst=True)


def downgrade(connection) -> None:
    pass
