from copy import deepcopy


TRANSFER_FINANCE_CATEGORY_SEEDS = [
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

COMPANY_FINANCE_CATEGORY_SEEDS = [
    {
        "name": "Ingreso General",
        "category_type": "income",
        "icon": "income",
        "note": "Ingreso operativo general",
        "sort_order": 10,
    },
    {
        "name": "Ventas",
        "category_type": "income",
        "icon": "income",
        "note": "Cobros por ventas",
        "sort_order": 20,
    },
    {
        "name": "Mantenciones y servicios",
        "category_type": "income",
        "icon": "cash",
        "note": "Cobros por mantenciones, visitas tecnicas o servicios recurrentes",
        "sort_order": 30,
    },
    {
        "name": "Contratos recurrentes",
        "category_type": "income",
        "icon": "income",
        "note": "Ingresos por contratos mensuales o anuales",
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
        "name": "Otros ingresos",
        "category_type": "income",
        "icon": "categories",
        "note": "Ingreso no clasificado",
        "sort_order": 60,
    },
    {
        "name": "Egreso General",
        "category_type": "expense",
        "icon": "expense",
        "note": "Gasto operativo general",
        "sort_order": 10,
    },
    {
        "name": "Sueldos y honorarios",
        "category_type": "expense",
        "icon": "salary",
        "note": "Pagos a personal interno o externo",
        "sort_order": 20,
    },
    {
        "name": "Arriendo y servicios",
        "category_type": "expense",
        "icon": "bills",
        "note": "Arriendo, internet, telefonia y servicios base",
        "sort_order": 30,
    },
    {
        "name": "Transporte y ruta",
        "category_type": "expense",
        "icon": "travel",
        "note": "Movilidad, peajes y traslados operativos",
        "sort_order": 40,
    },
    {
        "name": "Herramientas e insumos",
        "category_type": "expense",
        "icon": "shopping",
        "note": "Herramientas y consumibles de trabajo",
        "sort_order": 50,
    },
    {
        "name": "Materiales de proyecto",
        "category_type": "expense",
        "icon": "home",
        "note": "Materiales asociados a proyectos, obras o faenas",
        "sort_order": 60,
    },
    {
        "name": "Combustible",
        "category_type": "expense",
        "icon": "car",
        "note": "Carga de combustible",
        "sort_order": 70,
    },
    {
        "name": "Costos de mantencion",
        "category_type": "expense",
        "icon": "categories",
        "note": "Materiales, subcontratos y costos directos de mantenciones",
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
        "name": "Publicidad y marketing",
        "category_type": "expense",
        "icon": "categories",
        "note": "Campanas, impresion y acciones comerciales",
        "sort_order": 100,
    },
    {
        "name": "Mantencion vehicular",
        "category_type": "expense",
        "icon": "car",
        "note": "Mantencion, repuestos o reparaciones del vehiculo",
        "sort_order": 110,
    },
    {
        "name": "Seguros",
        "category_type": "expense",
        "icon": "insurance",
        "note": "Polizas y seguros",
        "sort_order": 120,
    },
] + TRANSFER_FINANCE_CATEGORY_SEEDS

HOME_FINANCE_CATEGORY_SEEDS = [
    {
        "name": "Ingreso General",
        "category_type": "income",
        "icon": "income",
        "note": "Ingreso general del hogar",
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
        "name": "Honorarios y servicios",
        "category_type": "income",
        "icon": "cash",
        "note": "Pagos recibidos por servicios",
        "sort_order": 30,
    },
    {
        "name": "Arriendos recibidos",
        "category_type": "income",
        "icon": "home",
        "note": "Ingresos por arriendos o subarriendos",
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
        "name": "Otros ingresos",
        "category_type": "income",
        "icon": "categories",
        "note": "Ingreso no clasificado",
        "sort_order": 60,
    },
    {
        "name": "Egreso General",
        "category_type": "expense",
        "icon": "expense",
        "note": "Gasto general del hogar",
        "sort_order": 10,
    },
    {
        "name": "Alimentacion",
        "category_type": "expense",
        "icon": "food",
        "note": "Comidas, colaciones o supermercado",
        "sort_order": 20,
    },
    {
        "name": "Hipotecario",
        "category_type": "expense",
        "icon": "home",
        "note": "Dividendos o gastos hipotecarios",
        "sort_order": 30,
    },
    {
        "name": "Electricidad",
        "category_type": "expense",
        "icon": "bills",
        "note": "Cuenta de electricidad",
        "sort_order": 40,
    },
    {
        "name": "Agua",
        "category_type": "expense",
        "icon": "bills",
        "note": "Cuenta de agua",
        "sort_order": 50,
    },
    {
        "name": "Gas",
        "category_type": "expense",
        "icon": "bills",
        "note": "Cuenta de gas",
        "sort_order": 60,
    },
    {
        "name": "Internet y telefonia",
        "category_type": "expense",
        "icon": "bills",
        "note": "Servicios de internet o telefonia",
        "sort_order": 70,
    },
    {
        "name": "Transporte y ruta",
        "category_type": "expense",
        "icon": "travel",
        "note": "Movilidad, peajes y traslados",
        "sort_order": 80,
    },
    {
        "name": "Salud",
        "category_type": "expense",
        "icon": "health",
        "note": "Gastos medicos o de salud",
        "sort_order": 90,
    },
    {
        "name": "Educacion",
        "category_type": "expense",
        "icon": "education",
        "note": "Cursos, colegiaturas o material educativo",
        "sort_order": 100,
    },
    {
        "name": "Ocio y salidas",
        "category_type": "expense",
        "icon": "leisure",
        "note": "Panoramas, salidas o recreacion",
        "sort_order": 110,
    },
    {
        "name": "Vestuario",
        "category_type": "expense",
        "icon": "shopping",
        "note": "Ropa y vestuario",
        "sort_order": 120,
    },
    {
        "name": "Mascotas",
        "category_type": "expense",
        "icon": "pet",
        "note": "Cuidado y gastos de mascotas",
        "sort_order": 130,
    },
    {
        "name": "Seguros",
        "category_type": "expense",
        "icon": "insurance",
        "note": "Polizas y seguros",
        "sort_order": 140,
    },
] + TRANSFER_FINANCE_CATEGORY_SEEDS


def resolve_finance_category_profile(tenant_type: str | None) -> str:
    normalized = (tenant_type or "").strip().lower()
    if normalized in {"empresa", "company", "business"}:
        return "company"
    return "home"


def get_default_finance_category_seeds(tenant_type: str | None) -> list[dict]:
    profile = resolve_finance_category_profile(tenant_type)
    seeds = (
        COMPANY_FINANCE_CATEGORY_SEEDS
        if profile == "company"
        else HOME_FINANCE_CATEGORY_SEEDS
    )
    return [deepcopy(item) for item in seeds]
