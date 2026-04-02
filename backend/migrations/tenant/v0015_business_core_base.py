from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    MetaData,
    String,
    Table,
    Text,
    UniqueConstraint,
    func,
)

MIGRATION_ID = "0015_business_core_base"
DESCRIPTION = "Create business core base tables"

metadata = MetaData()

business_organizations = Table(
    "business_organizations",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("name", String(150), nullable=False, unique=True, index=True),
    Column("legal_name", String(180), nullable=True),
    Column("tax_id", String(60), nullable=True, index=True),
    Column("organization_kind", String(40), nullable=False, server_default="client", index=True),
    Column("phone", String(60), nullable=True),
    Column("email", String(150), nullable=True),
    Column("notes", Text, nullable=True),
    Column("is_active", Boolean, nullable=False, server_default="1", index=True),
    Column("sort_order", Integer, nullable=False, server_default="100", index=True),
    Column("created_at", DateTime(timezone=True), nullable=False, server_default=func.now(), index=True),
    Column("updated_at", DateTime(timezone=True), nullable=False, server_default=func.now()),
)

business_clients = Table(
    "business_clients",
    metadata,
    Column("id", Integer, primary_key=True),
    Column(
        "organization_id",
        Integer,
        ForeignKey("business_organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    ),
    Column("client_code", String(60), nullable=True, unique=True, index=True),
    Column("service_status", String(40), nullable=False, server_default="active", index=True),
    Column("commercial_notes", Text, nullable=True),
    Column("is_active", Boolean, nullable=False, server_default="1", index=True),
    Column("sort_order", Integer, nullable=False, server_default="100", index=True),
    Column("created_at", DateTime(timezone=True), nullable=False, server_default=func.now(), index=True),
    Column("updated_at", DateTime(timezone=True), nullable=False, server_default=func.now()),
    UniqueConstraint("organization_id", name="uq_business_clients_organization_id"),
)

business_contacts = Table(
    "business_contacts",
    metadata,
    Column("id", Integer, primary_key=True),
    Column(
        "organization_id",
        Integer,
        ForeignKey("business_organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    ),
    Column("full_name", String(150), nullable=False, index=True),
    Column("email", String(150), nullable=True, index=True),
    Column("phone", String(60), nullable=True),
    Column("role_title", String(120), nullable=True),
    Column("is_primary", Boolean, nullable=False, server_default="0", index=True),
    Column("is_active", Boolean, nullable=False, server_default="1", index=True),
    Column("sort_order", Integer, nullable=False, server_default="100", index=True),
    Column("created_at", DateTime(timezone=True), nullable=False, server_default=func.now(), index=True),
    Column("updated_at", DateTime(timezone=True), nullable=False, server_default=func.now()),
)

business_sites = Table(
    "business_sites",
    metadata,
    Column("id", Integer, primary_key=True),
    Column(
        "client_id",
        Integer,
        ForeignKey("business_clients.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    ),
    Column("name", String(150), nullable=False),
    Column("site_code", String(60), nullable=True, unique=True, index=True),
    Column("address_line", String(200), nullable=True),
    Column("city", String(120), nullable=True),
    Column("region", String(120), nullable=True),
    Column("country_code", String(8), nullable=True, server_default="CL"),
    Column("reference_notes", Text, nullable=True),
    Column("is_active", Boolean, nullable=False, server_default="1", index=True),
    Column("sort_order", Integer, nullable=False, server_default="100", index=True),
    Column("created_at", DateTime(timezone=True), nullable=False, server_default=func.now(), index=True),
    Column("updated_at", DateTime(timezone=True), nullable=False, server_default=func.now()),
)


def upgrade(connection) -> None:
    metadata.create_all(connection, checkfirst=True)


def downgrade(connection) -> None:
    business_sites.drop(connection, checkfirst=True)
    business_contacts.drop(connection, checkfirst=True)
    business_clients.drop(connection, checkfirst=True)
    business_organizations.drop(connection, checkfirst=True)
