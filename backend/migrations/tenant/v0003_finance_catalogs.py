import json

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    MetaData,
    String,
    Table,
    Text,
    UniqueConstraint,
    func,
    select,
)

MIGRATION_ID = "0003_finance_catalogs"
DESCRIPTION = "Create finance base catalogs and seed defaults"

metadata = MetaData()

finance_currencies = Table(
    "finance_currencies",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("code", String(10), nullable=False, unique=True, index=True),
    Column("name", String(100), nullable=False),
    Column("symbol", String(10), nullable=False),
    Column("decimal_places", Integer, nullable=False, server_default="2"),
    Column("is_base", Boolean, nullable=False, server_default="0", index=True),
    Column("is_active", Boolean, nullable=False, server_default="1", index=True),
    Column("sort_order", Integer, nullable=False, server_default="100", index=True),
    Column("created_at", DateTime(timezone=True), nullable=False, server_default=func.now(), index=True),
    Column("updated_at", DateTime(timezone=True), nullable=False, server_default=func.now()),
)

finance_accounts = Table(
    "finance_accounts",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("name", String(150), nullable=False),
    Column("code", String(60), nullable=True, unique=True),
    Column("account_type", String(30), nullable=False, index=True),
    Column("currency_id", Integer, ForeignKey("finance_currencies.id"), nullable=False, index=True),
    Column("parent_account_id", Integer, ForeignKey("finance_accounts.id"), nullable=True, index=True),
    Column("opening_balance", Float, nullable=False, server_default="0"),
    Column("opening_balance_at", DateTime(timezone=True), nullable=True),
    Column("icon", String(50), nullable=True),
    Column("is_favorite", Boolean, nullable=False, server_default="0"),
    Column("is_balance_hidden", Boolean, nullable=False, server_default="0"),
    Column("is_active", Boolean, nullable=False, server_default="1", index=True),
    Column("sort_order", Integer, nullable=False, server_default="100", index=True),
    Column("created_at", DateTime(timezone=True), nullable=False, server_default=func.now(), index=True),
    Column("updated_at", DateTime(timezone=True), nullable=False, server_default=func.now()),
)

finance_categories = Table(
    "finance_categories",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("name", String(150), nullable=False),
    Column("category_type", String(20), nullable=False, index=True),
    Column("parent_category_id", Integer, ForeignKey("finance_categories.id"), nullable=True, index=True),
    Column("icon", String(50), nullable=True),
    Column("color", String(20), nullable=True),
    Column("note", Text, nullable=True),
    Column("is_active", Boolean, nullable=False, server_default="1", index=True),
    Column("sort_order", Integer, nullable=False, server_default="100", index=True),
    Column("created_at", DateTime(timezone=True), nullable=False, server_default=func.now(), index=True),
    Column("updated_at", DateTime(timezone=True), nullable=False, server_default=func.now()),
    UniqueConstraint("name", "category_type", name="uq_finance_categories_name_type"),
)

finance_beneficiaries = Table(
    "finance_beneficiaries",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("name", String(150), nullable=False, unique=True),
    Column("icon", String(50), nullable=True),
    Column("note", Text, nullable=True),
    Column("is_active", Boolean, nullable=False, server_default="1", index=True),
    Column("sort_order", Integer, nullable=False, server_default="100", index=True),
    Column("created_at", DateTime(timezone=True), nullable=False, server_default=func.now(), index=True),
    Column("updated_at", DateTime(timezone=True), nullable=False, server_default=func.now()),
)

finance_people = Table(
    "finance_people",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("name", String(150), nullable=False, unique=True),
    Column("icon", String(50), nullable=True),
    Column("note", Text, nullable=True),
    Column("is_active", Boolean, nullable=False, server_default="1", index=True),
    Column("sort_order", Integer, nullable=False, server_default="100", index=True),
    Column("created_at", DateTime(timezone=True), nullable=False, server_default=func.now(), index=True),
    Column("updated_at", DateTime(timezone=True), nullable=False, server_default=func.now()),
)

finance_projects = Table(
    "finance_projects",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("name", String(150), nullable=False, unique=True),
    Column("code", String(60), nullable=True, unique=True),
    Column("note", Text, nullable=True),
    Column("is_active", Boolean, nullable=False, server_default="1", index=True),
    Column("sort_order", Integer, nullable=False, server_default="100", index=True),
    Column("created_at", DateTime(timezone=True), nullable=False, server_default=func.now(), index=True),
    Column("updated_at", DateTime(timezone=True), nullable=False, server_default=func.now()),
)

finance_tags = Table(
    "finance_tags",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("name", String(100), nullable=False, unique=True),
    Column("color", String(20), nullable=True),
    Column("is_active", Boolean, nullable=False, server_default="1", index=True),
    Column("sort_order", Integer, nullable=False, server_default="100", index=True),
    Column("created_at", DateTime(timezone=True), nullable=False, server_default=func.now(), index=True),
    Column("updated_at", DateTime(timezone=True), nullable=False, server_default=func.now()),
)

finance_exchange_rates = Table(
    "finance_exchange_rates",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("source_currency_id", Integer, ForeignKey("finance_currencies.id"), nullable=False, index=True),
    Column("target_currency_id", Integer, ForeignKey("finance_currencies.id"), nullable=False, index=True),
    Column("rate", Float, nullable=False),
    Column("effective_at", DateTime(timezone=True), nullable=False, index=True),
    Column("source", String(50), nullable=True),
    Column("note", Text, nullable=True),
    Column("created_at", DateTime(timezone=True), nullable=False, server_default=func.now(), index=True),
    UniqueConstraint(
        "source_currency_id",
        "target_currency_id",
        "effective_at",
        name="uq_finance_exchange_rates_pair_effective_at",
    ),
)

finance_settings = Table(
    "finance_settings",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("setting_key", String(100), nullable=False, unique=True),
    Column("setting_value", Text, nullable=False),
    Column("is_active", Boolean, nullable=False, server_default="1", index=True),
    Column("updated_at", DateTime(timezone=True), nullable=False, server_default=func.now()),
    Column("created_at", DateTime(timezone=True), nullable=False, server_default=func.now(), index=True),
)

finance_activity_logs = Table(
    "finance_activity_logs",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("event_type", String(80), nullable=False, index=True),
    Column("entity_type", String(80), nullable=False, index=True),
    Column("entity_id", String(80), nullable=True, index=True),
    Column("actor_user_id", Integer, nullable=True, index=True),
    Column("summary", String(255), nullable=False),
    Column("payload_json", Text, nullable=True),
    Column("created_at", DateTime(timezone=True), nullable=False, server_default=func.now(), index=True),
)


def upgrade(connection) -> None:
    metadata.create_all(bind=connection, checkfirst=True)
    _seed_default_currency(connection)
    _seed_default_categories(connection)
    _seed_finance_settings(connection)


def _seed_default_currency(connection) -> None:
    existing = connection.execute(
        select(finance_currencies.c.id).where(finance_currencies.c.code == "USD")
    ).first()
    if existing:
        return

    connection.execute(
        finance_currencies.insert().values(
            code="USD",
            name="US Dollar",
            symbol="$",
            decimal_places=2,
            is_base=True,
            is_active=True,
            sort_order=10,
        )
    )


def _seed_default_categories(connection) -> None:
    default_categories = [
        {"name": "General Income", "category_type": "income", "sort_order": 10},
        {"name": "General Expense", "category_type": "expense", "sort_order": 10},
        {"name": "Transfer", "category_type": "transfer", "sort_order": 20},
    ]

    for category in default_categories:
        existing = connection.execute(
            select(finance_categories.c.id).where(
                finance_categories.c.name == category["name"],
                finance_categories.c.category_type == category["category_type"],
            )
        ).first()
        if existing:
            continue

        connection.execute(
            finance_categories.insert().values(
                name=category["name"],
                category_type=category["category_type"],
                sort_order=category["sort_order"],
                is_active=True,
            )
        )


def _seed_finance_settings(connection) -> None:
    settings_payload = {
        "base_currency_code": "USD",
        "account_types_catalog": [
            "cash",
            "bank",
            "card",
            "savings",
            "investment",
            "credit",
            "other",
        ],
    }

    for setting_key, setting_value in settings_payload.items():
        existing = connection.execute(
            select(finance_settings.c.id).where(finance_settings.c.setting_key == setting_key)
        ).first()
        if existing:
            continue

        serialized = (
            setting_value if isinstance(setting_value, str) else json.dumps(setting_value)
        )
        connection.execute(
            finance_settings.insert().values(
                setting_key=setting_key,
                setting_value=serialized,
                is_active=True,
            )
        )
