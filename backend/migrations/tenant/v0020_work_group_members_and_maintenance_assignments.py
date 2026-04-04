from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    MetaData,
    Table,
    Text,
    UniqueConstraint,
    func,
    inspect,
    text,
)

MIGRATION_ID = "0020_work_group_members_and_maintenance_assignments"
DESCRIPTION = "Create work group members and add maintenance work group assignments"

metadata = MetaData()

Table("business_work_groups", metadata, Column("id", Integer, primary_key=True))
Table("users", metadata, Column("id", Integer, primary_key=True))
Table("business_function_profiles", metadata, Column("id", Integer, primary_key=True))

business_work_group_members = Table(
    "business_work_group_members",
    metadata,
    Column("id", Integer, primary_key=True),
    Column(
        "group_id",
        Integer,
        ForeignKey("business_work_groups.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    ),
    Column(
        "tenant_user_id",
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    ),
    Column(
        "function_profile_id",
        Integer,
        ForeignKey("business_function_profiles.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    ),
    Column("is_primary", Boolean, nullable=False, server_default="0", index=True),
    Column("is_lead", Boolean, nullable=False, server_default="0", index=True),
    Column("is_active", Boolean, nullable=False, server_default="1", index=True),
    Column("starts_at", DateTime(timezone=True), nullable=True),
    Column("ends_at", DateTime(timezone=True), nullable=True),
    Column("notes", Text, nullable=True),
    Column("created_at", DateTime(timezone=True), nullable=False, server_default=func.now(), index=True),
    Column("updated_at", DateTime(timezone=True), nullable=False, server_default=func.now()),
    UniqueConstraint("group_id", "tenant_user_id", name="uq_business_work_group_member"),
)


def upgrade(connection) -> None:
    inspector = inspect(connection)
    existing_tables = set(inspector.get_table_names())
    if "business_work_group_members" not in existing_tables:
        metadata.create_all(
            connection,
            tables=[business_work_group_members],
            checkfirst=True,
        )

    work_order_columns = {
        column["name"] for column in inspector.get_columns("maintenance_work_orders")
    }
    if "assigned_work_group_id" not in work_order_columns:
        connection.execute(
            text("ALTER TABLE maintenance_work_orders ADD COLUMN assigned_work_group_id INTEGER")
        )

    visit_columns = {
        column["name"] for column in inspector.get_columns("maintenance_visits")
    }
    if "assigned_work_group_id" not in visit_columns:
        connection.execute(
            text("ALTER TABLE maintenance_visits ADD COLUMN assigned_work_group_id INTEGER")
        )


def downgrade(connection) -> None:
    # Se deja sin downgrade por compatibilidad con sqlite de pruebas.
    pass
