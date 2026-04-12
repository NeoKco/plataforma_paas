from copy import deepcopy


DEFAULT_FUNCTION_PROFILE_SEEDS = [
    {
        "code": "tecnico",
        "name": "tecnico",
        "description": "Perfil tecnico operativo para mantenciones, instalaciones y terreno.",
        "sort_order": 10,
    },
    {
        "code": "lider",
        "name": "lider",
        "description": "Responsable de coordinar y liderar trabajo operativo o comercial.",
        "sort_order": 20,
    },
    {
        "code": "administrativo",
        "name": "administrativo",
        "description": "Perfil administrativo para coordinacion, soporte y cierre interno.",
        "sort_order": 30,
    },
    {
        "code": "vendedor",
        "name": "vendedor",
        "description": "Perfil comercial para ventas, seguimiento y relacion con clientes.",
        "sort_order": 40,
    },
    {
        "code": "supervisor",
        "name": "supervisor",
        "description": "Perfil supervisor para control, aprobacion y seguimiento.",
        "sort_order": 50,
    },
    {
        "code": "otro",
        "name": "otro",
        "description": "Perfil generico para funciones no clasificadas todavia.",
        "sort_order": 60,
    },
]


DEFAULT_TASK_TYPE_SEEDS = [
    {
        "code": "mantencion",
        "name": "mantencion",
        "description": "Trabajo recurrente o correctivo de mantencion.",
        "color": "#2563eb",
        "icon": "build",
        "sort_order": 10,
        "compatible_function_profile_codes": [
            "tecnico",
            "lider",
            "supervisor",
        ],
    },
    {
        "code": "instalacion",
        "name": "instalacion",
        "description": "Trabajo de instalacion, puesta en marcha o montaje.",
        "color": "#0f766e",
        "icon": "settings",
        "sort_order": 20,
        "compatible_function_profile_codes": [
            "tecnico",
            "lider",
            "supervisor",
        ],
    },
    {
        "code": "tareas-generales",
        "name": "tareas generales",
        "description": "Trabajo general que no pertenece a una taxonomia especifica.",
        "color": "#475569",
        "icon": "checklist",
        "sort_order": 30,
        "compatible_function_profile_codes": [
            "tecnico",
            "administrativo",
            "lider",
            "supervisor",
            "otro",
        ],
    },
    {
        "code": "ventas",
        "name": "ventas",
        "description": "Trabajo comercial, seguimiento o gestion de oportunidades.",
        "color": "#7c3aed",
        "icon": "sell",
        "sort_order": 40,
        "compatible_function_profile_codes": [
            "vendedor",
            "lider",
            "supervisor",
            "administrativo",
        ],
    },
    {
        "code": "administracion",
        "name": "administracion",
        "description": "Trabajo administrativo, documental o de soporte interno.",
        "color": "#b45309",
        "icon": "folder",
        "sort_order": 50,
        "compatible_function_profile_codes": [
            "administrativo",
            "lider",
            "supervisor",
            "otro",
        ],
    },
]


def get_default_function_profile_seeds() -> list[dict]:
    return [deepcopy(item) for item in DEFAULT_FUNCTION_PROFILE_SEEDS]


def get_default_task_type_seeds() -> list[dict]:
    return [deepcopy(item) for item in DEFAULT_TASK_TYPE_SEEDS]
