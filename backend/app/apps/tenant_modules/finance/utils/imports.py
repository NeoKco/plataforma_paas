from copy import deepcopy


FINANCE_LEGACY_EGRESOS_SOURCE_TYPE = "legacy_csv_egresos"

DEFAULT_FINANCE_LEGACY_EGRESOS_PROFILE = {
    "profile_name": "legacy_egresos_csv",
    "source_type": FINANCE_LEGACY_EGRESOS_SOURCE_TYPE,
    "transaction_type": "expense",
    "currency_code": "CLP",
    "account_name": "efectivo",
    "account_type": "cash",
    "attachment_note": "Documento importado desde egresos.csv",
    "compression": {
        "max_width": 1800,
        "max_height": 1800,
        "quality": 72,
    },
    "categories": {
        "1": {"name": "Gastos menores", "icon": "shopping"},
        "2": {"name": "Transporte y ruta", "icon": "travel"},
        "8": {"name": "Herramientas e insumos", "icon": "shopping"},
        "9": {"name": "Materiales de proyecto", "icon": "home"},
        "10": {"name": "Combustible", "icon": "car"},
        "13": {"name": "Publicidad impresa", "icon": "categories"},
        "16": {"name": "Mantención vehicular", "icon": "car"},
        "18": {"name": "Impuestos", "icon": "bills"},
        "19": {"name": "Internet y telefonía", "icon": "bills"},
        "26": {"name": "Alimentación", "icon": "food"},
        "27": {"name": "TAG y peajes", "icon": "travel"},
        "28": {"name": "Salud", "icon": "health"},
        "29": {"name": "Hipotecario", "icon": "home"},
        "31": {"name": "Ocio y salidas", "icon": "leisure"},
        "33": {"name": "Electricidad", "icon": "bills"},
        "34": {"name": "Agua", "icon": "bills"},
        "35": {"name": "Gas", "icon": "bills"},
        "36": {"name": "Internet y telefonía", "icon": "bills"},
        "39": {"name": "Vestuario", "icon": "shopping"},
        "40": {"name": "Regalos", "icon": "gift"},
        "47": {"name": "Crédito de consumo", "icon": "bills"},
        "48": {"name": "Crédito camioneta", "icon": "car"},
        "49": {"name": "Deporte", "icon": "leisure"},
        "50": {"name": "TAG y peajes", "icon": "travel"},
        "51": {"name": "Estacionamiento", "icon": "travel"},
        "52": {"name": "Estacionamiento", "icon": "travel"},
    },
}


def build_default_finance_legacy_egresos_profile() -> dict:
    return deepcopy(DEFAULT_FINANCE_LEGACY_EGRESOS_PROFILE)

