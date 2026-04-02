from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Integer,
    MetaData,
    String,
    Table,
    Text,
    func,
)

MIGRATION_ID = "0017_business_core_taxonomy"
DESCRIPTION = "Create business core taxonomy tables"

metadata = MetaData()

business_function_profiles = Table(
    "business_function_profiles",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("code", String(60), nullable=False, unique=True, index=True),
    Column("name", String(150), nullable=False, unique=True, index=True),
    Column("description", Text, nullable=True),
    Column("is_active", Boolean, nullable=False, server_default="1", index=True),
    Column("sort_order", Integer, nullable=False, server_default="100", index=True),
    Column("created_at", DateTime(timezone=True), nullable=False, server_default=func.now(), index=True),
    Column("updated_at", DateTime(timezone=True), nullable=False, server_default=func.now()),
)

business_work_groups = Table(
    "business_work_groups",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("code", String(60), nullable=True, unique=True, index=True),
    Column("name", String(150), nullable=False, unique=True, index=True),
    Column("description", Text, nullable=True),
    Column("group_kind", String(40), nullable=False, server_default="operations", index=True),
    Column("is_active", Boolean, nullable=False, server_default="1", index=True),
    Column("sort_order", Integer, nullable=False, server_default="100", index=True),
    Column("created_at", DateTime(timezone=True), nullable=False, server_default=func.now(), index=True),
    Column("updated_at", DateTime(timezone=True), nullable=False, server_default=func.now()),
)

business_task_types = Table(
    "business_task_types",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("code", String(60), nullable=False, unique=True, index=True),
    Column("name", String(150), nullable=False, unique=True, index=True),
    Column("description", Text, nullable=True),
    Column("color", String(20), nullable=True),
    Column("icon", String(60), nullable=True),
    Column("is_active", Boolean, nullable=False, server_default="1", index=True),
    Column("sort_order", Integer, nullable=False, server_default="100", index=True),
    Column("created_at", DateTime(timezone=True), nullable=False, server_default=func.now(), index=True),
    Column("updated_at", DateTime(timezone=True), nullable=False, server_default=func.now()),
)


def upgrade(connection) -> None:
    metadata.create_all(connection, checkfirst=True)


def downgrade(connection) -> None:
    business_task_types.drop(connection, checkfirst=True)
    business_work_groups.drop(connection, checkfirst=True)
    business_function_profiles.drop(connection, checkfirst=True)
