from sqlalchemy import Boolean, Column, Integer, MetaData, String, Table, Text, select

from migrations.tenant.v0003_finance_catalogs import DEFAULT_FINANCE_CATEGORY_SEEDS

MIGRATION_ID = "0014_finance_default_category_catalog"
DESCRIPTION = "Expand finance default category catalog"

metadata = MetaData()

finance_categories = Table(
    "finance_categories",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("name", String(150), nullable=False),
    Column("category_type", String(20), nullable=False),
    Column("icon", String(50), nullable=True),
    Column("note", Text, nullable=True),
    Column("is_active", Boolean, nullable=False),
    Column("sort_order", Integer, nullable=False),
)

LEGACY_BASE_CATEGORY_RENAMES = [
    {
        "legacy_name": "General Income",
        "new_name": "Ingreso General",
        "category_type": "income",
    },
    {
        "legacy_name": "General Expense",
        "new_name": "Egreso General",
        "category_type": "expense",
    },
    {
        "legacy_name": "Transfer",
        "new_name": "Transferencia interna",
        "category_type": "transfer",
    },
]


def upgrade(connection) -> None:
    _rename_legacy_base_categories(connection)
    _seed_expanded_default_categories(connection)


def downgrade(connection) -> None:
    # Default categories are tenant data; do not delete them on downgrade.
    return None


def _rename_legacy_base_categories(connection) -> None:
    for rename in LEGACY_BASE_CATEGORY_RENAMES:
        legacy_row = connection.execute(
            select(finance_categories.c.id).where(
                finance_categories.c.name == rename["legacy_name"],
                finance_categories.c.category_type == rename["category_type"],
            )
        ).first()
        if not legacy_row:
            continue

        current_row = connection.execute(
            select(finance_categories.c.id).where(
                finance_categories.c.name == rename["new_name"],
                finance_categories.c.category_type == rename["category_type"],
            )
        ).first()
        if current_row:
            continue

        connection.execute(
            finance_categories.update()
            .where(finance_categories.c.id == legacy_row[0])
            .values(name=rename["new_name"])
        )


def _seed_expanded_default_categories(connection) -> None:
    for category in DEFAULT_FINANCE_CATEGORY_SEEDS:
        existing = connection.execute(
            select(
                finance_categories.c.id,
                finance_categories.c.icon,
                finance_categories.c.note,
                finance_categories.c.sort_order,
                finance_categories.c.is_active,
            ).where(
                finance_categories.c.name == category["name"],
                finance_categories.c.category_type == category["category_type"],
            )
        ).mappings().first()
        if existing:
            update_values = {}
            if not existing["is_active"]:
                update_values["is_active"] = True
            if not existing["icon"] and category.get("icon"):
                update_values["icon"] = category["icon"]
            if not existing["note"] and category.get("note"):
                update_values["note"] = category["note"]
            if existing["sort_order"] in {None, 100}:
                update_values["sort_order"] = category["sort_order"]
            if update_values:
                connection.execute(
                    finance_categories.update()
                    .where(finance_categories.c.id == existing["id"])
                    .values(**update_values)
                )
            continue

        connection.execute(
            finance_categories.insert().values(
                name=category["name"],
                category_type=category["category_type"],
                icon=category.get("icon"),
                note=category.get("note"),
                is_active=True,
                sort_order=category["sort_order"],
            )
        )
