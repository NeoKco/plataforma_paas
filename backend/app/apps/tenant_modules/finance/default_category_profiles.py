from copy import deepcopy


FAMILY_CATEGORY_SEEDS = [
    {
        "name": "Ingresos",
        "category_type": "income",
        "icon": "categories",
        "note": "Familia principal para ingresos.",
        "sort_order": 1,
    },
    {
        "name": "Egresos",
        "category_type": "expense",
        "icon": "categories",
        "note": "Familia principal para egresos.",
        "sort_order": 2,
    },
    {
        "name": "Transferencias",
        "category_type": "transfer",
        "icon": "categories",
        "note": "Familia principal para transferencias internas.",
        "sort_order": 3,
    },
]

TRANSFER_FINANCE_CATEGORY_SEEDS = [
    {
        "name": "Transferencia interna",
        "category_type": "transfer",
        "icon": "balance",
        "note": "Traspaso entre cuentas propias.",
        "sort_order": 10,
        "parent_name": "Transferencias",
    },
    {
        "name": "Deposito entre cuentas",
        "category_type": "transfer",
        "icon": "cash",
        "note": "Movimiento interno hacia otra cuenta propia.",
        "sort_order": 20,
        "parent_name": "Transferencias",
    },
    {
        "name": "Ajuste de saldo",
        "category_type": "transfer",
        "icon": "categories",
        "note": "Regularizacion o ajuste interno.",
        "sort_order": 30,
        "parent_name": "Transferencias",
    },
]

SHARED_FINANCE_CATEGORY_SEEDS = [
    {
        "name": "Ingreso General",
        "category_type": "income",
        "icon": "income",
        "note": "Ingreso general reutilizable para cualquier tenant.",
        "sort_order": 10,
        "parent_name": "Ingresos",
    },
    {
        "name": "Ventas",
        "category_type": "income",
        "icon": "income",
        "note": "Cobros por ventas y cierres comerciales.",
        "sort_order": 20,
        "parent_name": "Ingresos",
    },
    {
        "name": "Mantenciones y servicios",
        "category_type": "income",
        "icon": "cash",
        "note": "Cobros por mantenciones, visitas tecnicas o servicios recurrentes.",
        "sort_order": 30,
        "parent_name": "Ingresos",
    },
    {
        "name": "Honorarios y servicios",
        "category_type": "income",
        "icon": "cash",
        "note": "Pagos recibidos por servicios profesionales u operativos.",
        "sort_order": 40,
        "parent_name": "Ingresos",
    },
    {
        "name": "Sueldo",
        "category_type": "income",
        "icon": "salary",
        "note": "Ingreso fijo o remuneracion recurrente.",
        "sort_order": 50,
        "parent_name": "Ingresos",
    },
    {
        "name": "Reembolso",
        "category_type": "income",
        "icon": "cash",
        "note": "Devoluciones o reintegros.",
        "sort_order": 60,
        "parent_name": "Ingresos",
    },
    {
        "name": "Otros ingresos",
        "category_type": "income",
        "icon": "categories",
        "note": "Ingreso no clasificado.",
        "sort_order": 70,
        "parent_name": "Ingresos",
    },
    {
        "name": "Egreso General",
        "category_type": "expense",
        "icon": "expense",
        "note": "Gasto operativo general.",
        "sort_order": 80,
        "parent_name": "Egresos",
    },
    {
        "name": "Costos de mantencion",
        "category_type": "expense",
        "icon": "build",
        "note": "Costos directos de mantenciones, visitas o servicio tecnico.",
        "sort_order": 90,
        "parent_name": "Egresos",
    },
    {
        "name": "Sueldos y honorarios",
        "category_type": "expense",
        "icon": "salary",
        "note": "Pagos a personal interno o externo.",
        "sort_order": 100,
        "parent_name": "Egresos",
    },
    {
        "name": "Arriendo y servicios",
        "category_type": "expense",
        "icon": "bills",
        "note": "Arriendos, cuentas base e infraestructura operativa.",
        "sort_order": 110,
        "parent_name": "Egresos",
    },
    {
        "name": "Transporte y ruta",
        "category_type": "expense",
        "icon": "travel",
        "note": "Movilidad, peajes y traslados.",
        "sort_order": 120,
        "parent_name": "Egresos",
    },
    {
        "name": "Herramientas e insumos",
        "category_type": "expense",
        "icon": "shopping",
        "note": "Compra o reposicion de insumos y herramientas.",
        "sort_order": 130,
        "parent_name": "Egresos",
    },
    {
        "name": "Materiales de proyecto",
        "category_type": "expense",
        "icon": "home",
        "note": "Materiales asociados a obras, instalaciones o faenas.",
        "sort_order": 140,
        "parent_name": "Egresos",
    },
    {
        "name": "Combustible",
        "category_type": "expense",
        "icon": "car",
        "note": "Carga de combustible.",
        "sort_order": 150,
        "parent_name": "Egresos",
    },
    {
        "name": "Publicidad y marketing",
        "category_type": "expense",
        "icon": "campaign",
        "note": "Promocion, campañas y acciones comerciales.",
        "sort_order": 160,
        "parent_name": "Egresos",
    },
    {
        "name": "Mantencion vehicular",
        "category_type": "expense",
        "icon": "car",
        "note": "Reparacion, mantencion o repuestos vehiculares.",
        "sort_order": 170,
        "parent_name": "Egresos",
    },
    {
        "name": "Impuestos",
        "category_type": "expense",
        "icon": "bills",
        "note": "Tributos y pagos fiscales.",
        "sort_order": 180,
        "parent_name": "Egresos",
    },
    {
        "name": "Seguros",
        "category_type": "expense",
        "icon": "insurance",
        "note": "Polizas y seguros generales.",
        "sort_order": 190,
        "parent_name": "Egresos",
    },
]

COMPANY_EXPENSE_CATEGORY_BASE = [
    ("Alimentacion", "food", "Comidas, supermercado o restaurante para operacion."),
    ("Transporte", "travel", "Locomocion, pasajes o traslados de empresa."),
    ("Salud", "health", "Consultas, examenes o gastos medicos."),
    ("Vivienda", "home", "Arriendo, oficina o gastos de infraestructura."),
    ("Educacion", "education", "Cursos, libros o capacitacion."),
    ("Ocio", "leisure", "Salidas, actividades o gastos recreativos de equipo."),
    ("Varios", "categories", "Otros gastos menores no clasificados."),
    ("Herramientas y equipos", "shopping", "Compra o mantencion de herramientas y equipos."),
    ("Materiales de obra", "home", "Materiales para trabajos, obras o proyectos."),
    ("Combustible", "car", "Gastos en bencina, diesel u otros combustibles."),
    ("Viaticos", "travel", "Gastos de viaje, alimentacion y estadia."),
    ("Servicios externos", "work", "Servicios contratados a terceros."),
    ("Publicidad y marketing", "campaign", "Promocion, avisos y campañas."),
    ("Papeleria y oficina", "inventory", "Utiles, papeleria e insumos de oficina."),
    ("Honorarios y asesorias", "salary", "Pagos a profesionales externos."),
    ("Reparaciones y mantenciones", "build", "Reparaciones y mantenciones de equipos o instalaciones."),
    ("Seguros", "insurance", "Seguros de vehiculos, equipos o responsabilidad."),
    ("Impuestos y contribuciones", "bills", "Impuestos, patentes y contribuciones."),
    ("Telefonia e internet", "bills", "Planes de telefono, internet y datos."),
    ("Capacitacion y cursos", "education", "Cursos, talleres y capacitaciones."),
    ("Licencias y permisos", "folder", "Tramites, licencias y permisos operativos."),
    ("Gastos bancarios", "payments", "Comisiones bancarias y costos financieros."),
    ("Arriendo de maquinaria", "construction", "Arriendo de maquinaria y equipos."),
    ("Uniformes y EPP", "inventory", "Uniformes y elementos de proteccion personal."),
    ("Software y suscripciones", "computer", "Licencias de software y suscripciones."),
]

HOME_EXPENSE_CATEGORY_BASE = [
    ("Alimentacion", "food", "Comidas, supermercado o restaurantes."),
    ("Transporte", "travel", "Locomocion, bencina o pasajes."),
    ("Salud", "health", "Medicinas, consultas y examenes."),
    ("Vivienda", "home", "Arriendo, cuentas y servicios del hogar."),
    ("Educacion", "education", "Colegios, cursos o libros."),
    ("Ocio", "leisure", "Cine, salidas y hobbies."),
    ("Varios", "categories", "Otros gastos menores."),
    ("Luz", "bills", "Cuenta de electricidad."),
    ("Agua", "bills", "Cuenta de agua potable."),
    ("Gas", "bills", "Cuenta o recarga de gas."),
    ("Internet y telefonia", "bills", "Servicios de internet y telefonia."),
    ("Mantenimiento del hogar", "build", "Reparaciones, mejoras y mantenciones del hogar."),
    ("Mascotas", "pet", "Alimento, veterinario y accesorios."),
    ("Ropa y calzado", "shopping", "Compras de ropa y zapatos."),
    ("Regalos", "gift", "Regalos para terceros."),
    ("Aseo y limpieza", "cleaning", "Productos de limpieza y aseo."),
    ("Seguros", "insurance", "Seguros del hogar, vida o similares."),
    ("Suscripciones", "computer", "Streaming, apps o membresias."),
    ("Imprevistos", "warning", "Gastos no planificados."),
    ("Jardineria", "park", "Herramientas, plantas y mantencion exterior."),
    ("Electrodomesticos", "home", "Compra o reparacion de electrodomesticos."),
]

FAMILY_PREFIX_BY_PROFILE = {
    "company": "Empresa",
    "home": "Casa",
}

FAMILY_NAME_BY_TYPE = {
    "income": "Ingresos",
    "expense": "Egresos",
    "transfer": "Transferencias",
}


def resolve_finance_category_profile(tenant_type: str | None) -> str:
    normalized = (tenant_type or "").strip().lower()
    if normalized in {"empresa", "company", "business"}:
        return "company"
    return "home"


def get_default_finance_category_seeds(tenant_type: str | None) -> list[dict]:
    primary_profile = resolve_finance_category_profile(tenant_type)
    ordered_profiles = ["company", "home"]
    if primary_profile == "home":
        ordered_profiles = ["home", "company"]

    seeds = [deepcopy(item) for item in FAMILY_CATEGORY_SEEDS]
    seeds.extend(deepcopy(item) for item in SHARED_FINANCE_CATEGORY_SEEDS)
    sort_offset = max(item["sort_order"] for item in seeds) + 10

    for profile in ordered_profiles:
        family_items = (
            COMPANY_EXPENSE_CATEGORY_BASE
            if profile == "company"
            else HOME_EXPENSE_CATEGORY_BASE
        )
        prefix = FAMILY_PREFIX_BY_PROFILE[profile]
        for index, (name, icon, note) in enumerate(family_items, start=1):
            seeds.append(
                {
                    "name": f"{prefix} - {name}",
                    "category_type": "expense",
                    "icon": icon,
                    "note": f"{note} Semilla clasificada desde ieris_app para perfil {prefix.lower()}.",
                    "sort_order": sort_offset + index,
                    "parent_name": "Egresos",
                }
            )
        sort_offset += len(family_items) + 10

    seeds.extend(deepcopy(item) for item in TRANSFER_FINANCE_CATEGORY_SEEDS)
    return seeds


def get_finance_family_name_by_type(category_type: str) -> str:
    return FAMILY_NAME_BY_TYPE.get(category_type.strip().lower(), "Egresos")
