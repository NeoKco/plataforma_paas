from dataclasses import dataclass, asdict


@dataclass(frozen=True)
class ModuleLimitCapability:
    key: str
    module_name: str
    resource_name: str
    period: str
    segment: str | None = None
    unit: str = "count"
    description: str | None = None


VALID_PLAN_MODULES = frozenset({"all", "core", "users", "finance", "maintenance", "crm"})

CORE_USERS_LIMIT_KEY = "core.users"
CORE_USERS_ACTIVE_LIMIT_KEY = "core.users.active"
CORE_USERS_MONTHLY_LIMIT_KEY = "core.users.monthly"
CORE_USERS_ROLE_LIMIT_KEYS = {
    "admin": "core.users.admin",
    "manager": "core.users.manager",
    "operator": "core.users.operator",
}

FINANCE_ENTRIES_LIMIT_KEY = "finance.entries"
FINANCE_ENTRIES_MONTHLY_LIMIT_KEY = "finance.entries.monthly"
FINANCE_ENTRIES_MONTHLY_TYPE_LIMIT_KEYS = {
    "income": "finance.entries.monthly.income",
    "expense": "finance.entries.monthly.expense",
}

MODULE_LIMIT_CAPABILITIES = (
    ModuleLimitCapability(
        key=CORE_USERS_LIMIT_KEY,
        module_name="core",
        resource_name="users",
        period="current",
        description="Total de usuarios tenant",
    ),
    ModuleLimitCapability(
        key=CORE_USERS_ACTIVE_LIMIT_KEY,
        module_name="core",
        resource_name="users",
        period="current",
        segment="active",
        description="Usuarios activos tenant",
    ),
    ModuleLimitCapability(
        key=CORE_USERS_MONTHLY_LIMIT_KEY,
        module_name="core",
        resource_name="users",
        period="monthly",
        description="Usuarios creados en el mes actual",
    ),
    ModuleLimitCapability(
        key=CORE_USERS_ROLE_LIMIT_KEYS["admin"],
        module_name="core",
        resource_name="users",
        period="current",
        segment="admin",
        description="Usuarios tenant con rol admin",
    ),
    ModuleLimitCapability(
        key=CORE_USERS_ROLE_LIMIT_KEYS["manager"],
        module_name="core",
        resource_name="users",
        period="current",
        segment="manager",
        description="Usuarios tenant con rol manager",
    ),
    ModuleLimitCapability(
        key=CORE_USERS_ROLE_LIMIT_KEYS["operator"],
        module_name="core",
        resource_name="users",
        period="current",
        segment="operator",
        description="Usuarios tenant con rol operator",
    ),
    ModuleLimitCapability(
        key=FINANCE_ENTRIES_LIMIT_KEY,
        module_name="finance",
        resource_name="entries",
        period="current",
        description="Total de movimientos financieros",
    ),
    ModuleLimitCapability(
        key=FINANCE_ENTRIES_MONTHLY_LIMIT_KEY,
        module_name="finance",
        resource_name="entries",
        period="monthly",
        description="Movimientos financieros creados en el mes actual",
    ),
    ModuleLimitCapability(
        key=FINANCE_ENTRIES_MONTHLY_TYPE_LIMIT_KEYS["income"],
        module_name="finance",
        resource_name="entries",
        period="monthly",
        segment="income",
        description="Ingresos creados en el mes actual",
    ),
    ModuleLimitCapability(
        key=FINANCE_ENTRIES_MONTHLY_TYPE_LIMIT_KEYS["expense"],
        module_name="finance",
        resource_name="entries",
        period="monthly",
        segment="expense",
        description="Gastos creados en el mes actual",
    ),
)

SUPPORTED_MODULE_LIMIT_KEYS = frozenset(
    capability.key for capability in MODULE_LIMIT_CAPABILITIES
)


def list_module_limit_capabilities() -> list[dict]:
    return [asdict(capability) for capability in MODULE_LIMIT_CAPABILITIES]
