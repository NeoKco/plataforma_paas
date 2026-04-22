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
    inspect,
    text,
)

MIGRATION_ID = "0039_social_community_groups"
DESCRIPTION = "Create social community groups and link them to clients"

metadata = MetaData()

social_community_groups = Table(
    "social_community_groups",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("name", String(150), nullable=False, unique=True, index=True),
    Column("commune", String(120), nullable=True),
    Column("sector", String(120), nullable=True),
    Column("zone", String(120), nullable=True),
    Column("territorial_classification", String(120), nullable=True),
    Column("notes", Text, nullable=True),
    Column("is_active", Boolean, nullable=False, server_default="1", index=True),
    Column("sort_order", Integer, nullable=False, server_default="100", index=True),
    Column("created_at", DateTime(timezone=True), nullable=False, server_default=func.now(), index=True),
    Column("updated_at", DateTime(timezone=True), nullable=False, server_default=func.now()),
)


def upgrade(connection) -> None:
    inspector = inspect(connection)
    existing_tables = set(inspector.get_table_names())
    if "social_community_groups" not in existing_tables:
        is_postgres = connection.dialect.name == "postgresql"
        create_table_sql = (
            """
            CREATE TABLE IF NOT EXISTS social_community_groups (
                id SERIAL PRIMARY KEY,
                name VARCHAR(150) NOT NULL UNIQUE,
                commune VARCHAR(120),
                sector VARCHAR(120),
                zone VARCHAR(120),
                territorial_classification VARCHAR(120),
                notes TEXT,
                is_active BOOLEAN NOT NULL DEFAULT TRUE,
                sort_order INTEGER NOT NULL DEFAULT 100,
                created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
            )
            """
            if is_postgres
            else """
            CREATE TABLE IF NOT EXISTS social_community_groups (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name VARCHAR(150) NOT NULL UNIQUE,
                commune VARCHAR(120),
                sector VARCHAR(120),
                zone VARCHAR(120),
                territorial_classification VARCHAR(120),
                notes TEXT,
                is_active BOOLEAN NOT NULL DEFAULT 1,
                sort_order INTEGER NOT NULL DEFAULT 100,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        connection.execute(
            text(create_table_sql)
        )
        connection.execute(
            text(
                "CREATE INDEX IF NOT EXISTS ix_social_community_groups_name "
                "ON social_community_groups (name)"
            )
        )
        connection.execute(
            text(
                "CREATE INDEX IF NOT EXISTS ix_social_community_groups_is_active "
                "ON social_community_groups (is_active)"
            )
        )
        connection.execute(
            text(
                "CREATE INDEX IF NOT EXISTS ix_social_community_groups_sort_order "
                "ON social_community_groups (sort_order)"
            )
        )
        connection.execute(
            text(
                "CREATE INDEX IF NOT EXISTS ix_social_community_groups_created_at "
                "ON social_community_groups (created_at)"
            )
        )

    existing_columns = {column["name"] for column in inspector.get_columns("business_clients")}
    if "social_community_group_id" not in existing_columns:
        connection.execute(
            text(
                "ALTER TABLE business_clients ADD COLUMN social_community_group_id INTEGER"
            )
        )
    connection.execute(
        text(
            "CREATE INDEX IF NOT EXISTS ix_business_clients_social_community_group_id "
            "ON business_clients (social_community_group_id)"
        )
    )
    _backfill_social_community_groups(connection)


def _normalize_group_key(value: str | None) -> str:
    normalized = (value or "").strip().lower()
    return " ".join(normalized.split())


def _backfill_social_community_groups(connection) -> None:
    inspector = inspect(connection)
    existing_tables = set(inspector.get_table_names())
    if not {
        "business_clients",
        "business_organizations",
        "social_community_groups",
    }.issubset(existing_tables):
        return

    existing_groups = connection.execute(
        text("SELECT id, name FROM social_community_groups ORDER BY id ASC")
    ).mappings().all()
    group_id_by_key = {
        _normalize_group_key(row["name"]): row["id"]
        for row in existing_groups
        if _normalize_group_key(row["name"])
    }

    client_rows = connection.execute(
        text(
            """
            SELECT
                c.id AS client_id,
                c.social_community_group_id AS social_community_group_id,
                o.legal_name AS legal_name,
                o.commune AS commune
            FROM business_clients c
            JOIN business_organizations o ON o.id = c.organization_id
            ORDER BY c.id ASC
            """
        )
    ).mappings().all()

    for row in client_rows:
        if row["social_community_group_id"] is not None:
            continue
        legal_name = (row["legal_name"] or "").strip()
        if not legal_name:
            continue
        normalized_key = _normalize_group_key(legal_name)
        if not normalized_key:
            continue
        group_id = group_id_by_key.get(normalized_key)
        if group_id is None:
            insert_result = connection.execute(
                social_community_groups.insert().values(
                    name=legal_name,
                    commune=(row["commune"] or "").strip() or None,
                    sector=None,
                    zone=None,
                    territorial_classification=None,
                    notes=None,
                    is_active=True,
                    sort_order=100,
                )
            )
            group_id = insert_result.inserted_primary_key[0]
            group_id_by_key[normalized_key] = group_id
        connection.execute(
            text(
                """
                UPDATE business_clients
                SET social_community_group_id = :group_id
                WHERE id = :client_id
                """
            ),
            {"group_id": group_id, "client_id": row["client_id"]},
        )


def downgrade(connection) -> None:
    pass
