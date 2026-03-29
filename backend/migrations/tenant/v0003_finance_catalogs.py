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

DEFAULT_FINANCE_CATEGORY_SEEDS = [
    {
        "name": "Ingreso General",
        "category_type": "income",
        "icon": "income",
        "note": "Ingreso operativo general",
        "sort_order": 10,
    },
    {
        "name": "Sueldo",
        "category_type": "income",
        "icon": "salary",
        "note": "Remuneracion o salario",
        "sort_order": 20,
    },
    {
        "name": "Ventas",
        "category_type": "income",
        "icon": "income",
        "note": "Cobros por ventas",
        "sort_order": 30,
    },
    {
        "name": "Honorarios y servicios",
        "category_type": "income",
        "icon": "cash",
        "note": "Pagos recibidos por servicios",
        "sort_order": 40,
    },
    {
        "name": "Reembolso",
        "category_type": "income",
        "icon": "cash",
        "note": "Devoluciones o reintegros",
        "sort_order": 50,
    },
    {
        "name": "Intereses y rendimientos",
        "category_type": "income",
        "icon": "income",
        "note": "Ganancias financieras o rendimientos",
        "sort_order": 60,
    },
    {
        "name": "Otros ingresos",
        "category_type": "income",
        "icon": "categories",
        "note": "Ingreso no clasificado",
        "sort_order": 70,
    },
    {
        "name": "Egreso General",
        "category_type": "expense",
        "icon": "expense",
        "note": "Gasto operativo general",
        "sort_order": 10,
    },
    {
        "name": "Gastos menores",
        "category_type": "expense",
        "icon": "shopping",
        "note": "Compras menores o caja chica",
        "sort_order": 20,
    },
    {
        "name": "Transporte y ruta",
        "category_type": "expense",
        "icon": "travel",
        "note": "Movilidad y traslados operativos",
        "sort_order": 30,
    },
    {
        "name": "Herramientas e insumos",
        "category_type": "expense",
        "icon": "shopping",
        "note": "Herramientas y consumibles de trabajo",
        "sort_order": 40,
    },
    {
        "name": "Materiales de proyecto",
        "category_type": "expense",
        "icon": "home",
        "note": "Materiales asociados a proyectos o faenas",
        "sort_order": 50,
    },
    {
        "name": "Combustible",
        "category_type": "expense",
        "icon": "car",
        "note": "Carga de combustible",
        "sort_order": 60,
    },
    {
        "name": "Publicidad impresa",
        "category_type": "expense",
        "icon": "categories",
        "note": "Impresion, grafica o promocion fisica",
        "sort_order": 70,
    },
    {
        "name": "Mantencion vehicular",
        "category_type": "expense",
        "icon": "car",
        "note": "Mantencion, repuestos o reparaciones del vehiculo",
        "sort_order": 80,
    },
    {
        "name": "Impuestos",
        "category_type": "expense",
        "icon": "bills",
        "note": "Tributos y pagos fiscales",
        "sort_order": 90,
    },
    {
        "name": "Internet y telefonia",
        "category_type": "expense",
        "icon": "bills",
        "note": "Servicios de internet o telefonia",
        "sort_order": 100,
    },
    {
        "name": "Alimentacion",
        "category_type": "expense",
        "icon": "food",
        "note": "Comidas, colaciones o abarrotes",
        "sort_order": 110,
    },
    {
        "name": "TAG y peajes",
        "category_type": "expense",
        "icon": "travel",
        "note": "Peajes, TAG y cobros de ruta",
        "sort_order": 120,
    },
    {
        "name": "Salud",
        "category_type": "expense",
        "icon": "health",
        "note": "Gastos medicos o de salud",
        "sort_order": 130,
    },
    {
        "name": "Hipotecario",
        "category_type": "expense",
        "icon": "home",
        "note": "Dividendos o gastos hipotecarios",
        "sort_order": 140,
    },
    {
        "name": "Ocio y salidas",
        "category_type": "expense",
        "icon": "leisure",
        "note": "Panoramas, salidas o recreacion",
        "sort_order": 150,
    },
    {
        "name": "Electricidad",
        "category_type": "expense",
        "icon": "bills",
        "note": "Cuenta de electricidad",
        "sort_order": 160,
    },
    {
        "name": "Agua",
        "category_type": "expense",
        "icon": "bills",
        "note": "Cuenta de agua",
        "sort_order": 170,
    },
    {
        "name": "Gas",
        "category_type": "expense",
        "icon": "bills",
        "note": "Cuenta de gas",
        "sort_order": 180,
    },
    {
        "name": "Vestuario",
        "category_type": "expense",
        "icon": "shopping",
        "note": "Ropa, uniformes o vestuario",
        "sort_order": 190,
    },
    {
        "name": "Regalos",
        "category_type": "expense",
        "icon": "gift",
        "note": "Compras para regalos",
        "sort_order": 200,
    },
    {
        "name": "Credito de consumo",
        "category_type": "expense",
        "icon": "bills",
        "note": "Pago de credito de consumo",
        "sort_order": 210,
    },
    {
        "name": "Credito camioneta",
        "category_type": "expense",
        "icon": "car",
        "note": "Pago de credito vehicular",
        "sort_order": 220,
    },
    {
        "name": "Deporte",
        "category_type": "expense",
        "icon": "leisure",
        "note": "Gastos deportivos o actividad fisica",
        "sort_order": 230,
    },
    {
        "name": "Estacionamiento",
        "category_type": "expense",
        "icon": "travel",
        "note": "Estacionamientos y parquimetros",
        "sort_order": 240,
    },
    {
        "name": "Educacion",
        "category_type": "expense",
        "icon": "education",
        "note": "Cursos, colegiaturas o material educativo",
        "sort_order": 250,
    },
    {
        "name": "Seguros",
        "category_type": "expense",
        "icon": "insurance",
        "note": "Polizas y seguros",
        "sort_order": 260,
    },
    {
        "name": "Mascotas",
        "category_type": "expense",
        "icon": "pet",
        "note": "Cuidado y gastos de mascotas",
        "sort_order": 270,
    },
    {
        "name": "Cuidado personal",
        "category_type": "expense",
        "icon": "personal-care",
        "note": "Higiene y cuidado personal",
        "sort_order": 280,
    },
    {
        "name": "Transferencia interna",
        "category_type": "transfer",
        "icon": "balance",
        "note": "Traspaso entre cuentas propias",
        "sort_order": 10,
    },
    {
        "name": "Deposito entre cuentas",
        "category_type": "transfer",
        "icon": "cash",
        "note": "Movimiento interno hacia otra cuenta propia",
        "sort_order": 20,
    },
    {
        "name": "Ajuste de saldo",
        "category_type": "transfer",
        "icon": "categories",
        "note": "Regularizacion o ajuste interno",
        "sort_order": 30,
    },
]

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
