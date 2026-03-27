from sqlalchemy import Boolean, Column, DateTime, Integer, MetaData, String, Table, func, select

MIGRATION_ID = "0004_finance_seed_clp"
DESCRIPTION = "Seed CLP currency for finance module"

metadata = MetaData()

finance_currencies = Table(
    "finance_currencies",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("code", String(10), nullable=False, unique=True, index=True),
    Column("name", String(100), nullable=False),
    Column("symbol", String(10), nullable=False),
    Column("decimal_places", Integer, nullable=False),
    Column("is_base", Boolean, nullable=False, server_default="0", index=True),
    Column("is_active", Boolean, nullable=False, server_default="1", index=True),
    Column("sort_order", Integer, nullable=False, server_default="100", index=True),
    Column("created_at", DateTime(timezone=True), nullable=False, server_default=func.now(), index=True),
    Column("updated_at", DateTime(timezone=True), nullable=False, server_default=func.now()),
)


def upgrade(connection) -> None:
    existing = connection.execute(
        select(finance_currencies.c.id).where(finance_currencies.c.code == "CLP")
    ).first()
    if existing:
        return

    connection.execute(
        finance_currencies.insert().values(
            code="CLP",
            name="Peso Chileno",
            symbol="$",
            decimal_places=0,
            is_base=False,
            is_active=True,
            sort_order=20,
        )
    )
