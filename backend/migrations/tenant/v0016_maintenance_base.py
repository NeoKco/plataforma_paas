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
    func,
)

MIGRATION_ID = "0016_maintenance_base"
DESCRIPTION = "Create maintenance base tables"

metadata = MetaData()

maintenance_equipment_types = Table(
    "maintenance_equipment_types",
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

maintenance_installations = Table(
    "maintenance_installations",
    metadata,
    Column("id", Integer, primary_key=True),
    Column(
        "site_id",
        Integer,
        ForeignKey("business_sites.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    ),
    Column(
        "equipment_type_id",
        Integer,
        ForeignKey("maintenance_equipment_types.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    ),
    Column("name", String(150), nullable=False, index=True),
    Column("serial_number", String(120), nullable=True, index=True),
    Column("manufacturer", String(120), nullable=True),
    Column("model", String(120), nullable=True),
    Column("installed_at", DateTime(timezone=True), nullable=True),
    Column("last_service_at", DateTime(timezone=True), nullable=True),
    Column("warranty_until", DateTime(timezone=True), nullable=True),
    Column("installation_status", String(40), nullable=False, server_default="active", index=True),
    Column("location_note", Text, nullable=True),
    Column("technical_notes", Text, nullable=True),
    Column("is_active", Boolean, nullable=False, server_default="1", index=True),
    Column("sort_order", Integer, nullable=False, server_default="100", index=True),
    Column("created_at", DateTime(timezone=True), nullable=False, server_default=func.now(), index=True),
    Column("updated_at", DateTime(timezone=True), nullable=False, server_default=func.now()),
)

maintenance_work_orders = Table(
    "maintenance_work_orders",
    metadata,
    Column("id", Integer, primary_key=True),
    Column(
        "client_id",
        Integer,
        ForeignKey("business_clients.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    ),
    Column(
        "site_id",
        Integer,
        ForeignKey("business_sites.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    ),
    Column(
        "installation_id",
        Integer,
        ForeignKey("maintenance_installations.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    ),
    Column("external_reference", String(80), nullable=True, unique=True, index=True),
    Column("title", String(180), nullable=False, index=True),
    Column("description", Text, nullable=True),
    Column("maintenance_status", String(40), nullable=False, server_default="scheduled", index=True),
    Column("priority", String(30), nullable=False, server_default="normal", index=True),
    Column("requested_at", DateTime(timezone=True), nullable=False, server_default=func.now(), index=True),
    Column("scheduled_for", DateTime(timezone=True), nullable=True, index=True),
    Column("completed_at", DateTime(timezone=True), nullable=True, index=True),
    Column("cancelled_at", DateTime(timezone=True), nullable=True),
    Column("cancellation_reason", Text, nullable=True),
    Column("closure_notes", Text, nullable=True),
    Column("assigned_tenant_user_id", Integer, nullable=True, index=True),
    Column("created_by_user_id", Integer, nullable=True, index=True),
    Column("created_at", DateTime(timezone=True), nullable=False, server_default=func.now(), index=True),
    Column("updated_at", DateTime(timezone=True), nullable=False, server_default=func.now()),
)

maintenance_visits = Table(
    "maintenance_visits",
    metadata,
    Column("id", Integer, primary_key=True),
    Column(
        "work_order_id",
        Integer,
        ForeignKey("maintenance_work_orders.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    ),
    Column("visit_status", String(40), nullable=False, server_default="scheduled", index=True),
    Column("scheduled_start_at", DateTime(timezone=True), nullable=True, index=True),
    Column("scheduled_end_at", DateTime(timezone=True), nullable=True),
    Column("actual_start_at", DateTime(timezone=True), nullable=True),
    Column("actual_end_at", DateTime(timezone=True), nullable=True),
    Column("assigned_tenant_user_id", Integer, nullable=True, index=True),
    Column("assigned_group_label", String(120), nullable=True, index=True),
    Column("notes", Text, nullable=True),
    Column("created_at", DateTime(timezone=True), nullable=False, server_default=func.now(), index=True),
    Column("updated_at", DateTime(timezone=True), nullable=False, server_default=func.now()),
)

maintenance_status_logs = Table(
    "maintenance_status_logs",
    metadata,
    Column("id", Integer, primary_key=True),
    Column(
        "work_order_id",
        Integer,
        ForeignKey("maintenance_work_orders.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    ),
    Column("from_status", String(40), nullable=True),
    Column("to_status", String(40), nullable=False, index=True),
    Column("note", Text, nullable=True),
    Column("changed_by_user_id", Integer, nullable=True, index=True),
    Column("changed_at", DateTime(timezone=True), nullable=False, server_default=func.now(), index=True),
)


def upgrade(connection) -> None:
    metadata.reflect(bind=connection, only=("business_clients", "business_sites"))
    metadata.create_all(connection, checkfirst=True)


def downgrade(connection) -> None:
    maintenance_status_logs.drop(connection, checkfirst=True)
    maintenance_visits.drop(connection, checkfirst=True)
    maintenance_work_orders.drop(connection, checkfirst=True)
    maintenance_installations.drop(connection, checkfirst=True)
    maintenance_equipment_types.drop(connection, checkfirst=True)
