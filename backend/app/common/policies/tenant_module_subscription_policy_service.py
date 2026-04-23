from dataclasses import dataclass


@dataclass(frozen=True)
class BasePlanCatalogEntry:
    plan_code: str
    display_name: str
    description: str | None = None
    included_modules: tuple[str, ...] = ()
    default_billing_cycle: str = "monthly"
    allowed_billing_cycles: tuple[str, ...] = ("monthly", "quarterly", "semiannual", "annual")
    is_default: bool = True


@dataclass(frozen=True)
class ModuleSubscriptionCatalogEntry:
    module_key: str
    display_name: str
    description: str | None = None
    activation_kind: str = "addon"
    billing_cycles: tuple[str, ...] = ()
    is_active: bool = True


class TenantModuleSubscriptionPolicyService:
    SUBSCRIPTION_ACTIVATION_MODEL = "base_plan_plus_module_subscriptions"
    VALID_BILLING_CYCLES = ("monthly", "quarterly", "semiannual", "annual")
    DEFAULT_BASE_PLAN_CODE = "base_finance"
    FINANCE_MODULE_KEY = "finance"
    TECHNICAL_BASELINE_MODULES = ("core", "users")

    BASE_PLAN_CATALOG = (
        BasePlanCatalogEntry(
            plan_code="base_finance",
            display_name="Plan Base",
            description="Incluye tenant activo, finanzas y operación base del carril.",
            included_modules=("finance",),
        ),
    )

    MODULE_SUBSCRIPTION_CATALOG = (
        ModuleSubscriptionCatalogEntry(
            module_key="finance",
            display_name="Finanzas",
            description="Módulo base incluido siempre en el Plan Base.",
            activation_kind="included",
        ),
        ModuleSubscriptionCatalogEntry(
            module_key="core",
            display_name="Core de negocio",
            description="Dependencia técnica/base compartida por otros módulos.",
            activation_kind="dependency",
        ),
        ModuleSubscriptionCatalogEntry(
            module_key="users",
            display_name="Usuarios",
            description="Capacidad base de acceso y operación tenant.",
            activation_kind="dependency",
        ),
        ModuleSubscriptionCatalogEntry(
            module_key="maintenance",
            display_name="Mantenciones",
            description="Módulo arrendable adicional sobre el Plan Base.",
            activation_kind="addon",
            billing_cycles=VALID_BILLING_CYCLES,
        ),
    )

    LEGACY_PLAN_CODE_TO_BILLING_CYCLE = {
        "mensual": "monthly",
        "monthly": "monthly",
        "trimestral": "quarterly",
        "quarterly": "quarterly",
        "semestral": "semiannual",
        "semiannual": "semiannual",
        "anual": "annual",
        "annual": "annual",
    }

    def list_base_plan_catalog(self) -> list[dict]:
        return [
            {
                "plan_code": entry.plan_code,
                "display_name": entry.display_name,
                "description": entry.description,
                "included_modules": list(entry.included_modules),
                "default_billing_cycle": entry.default_billing_cycle,
                "allowed_billing_cycles": list(entry.allowed_billing_cycles),
                "is_default": entry.is_default,
            }
            for entry in self.BASE_PLAN_CATALOG
        ]

    def list_module_subscription_catalog(self) -> list[dict]:
        return [
            {
                "module_key": entry.module_key,
                "display_name": entry.display_name,
                "description": entry.description,
                "activation_kind": entry.activation_kind,
                "billing_cycles": list(entry.billing_cycles),
                "is_active": entry.is_active,
            }
            for entry in self.MODULE_SUBSCRIPTION_CATALOG
        ]

    def list_subscription_billing_cycles(self) -> list[str]:
        return list(self.VALID_BILLING_CYCLES)

    def list_technical_baseline_modules(self) -> list[str]:
        return list(self.TECHNICAL_BASELINE_MODULES)

    def get_base_plan_catalog_entry(
        self,
        plan_code: str | None,
    ) -> BasePlanCatalogEntry | None:
        if not plan_code:
            return None

        normalized_plan_code = plan_code.strip().lower()
        for entry in self.BASE_PLAN_CATALOG:
            if entry.plan_code == normalized_plan_code:
                return entry
        return None

    def get_module_subscription_catalog_entry(
        self,
        module_key: str | None,
    ) -> ModuleSubscriptionCatalogEntry | None:
        if not module_key:
            return None

        normalized_module_key = module_key.strip().lower()
        for entry in self.MODULE_SUBSCRIPTION_CATALOG:
            if entry.module_key == normalized_module_key:
                return entry
        return None

    def infer_billing_cycle_from_legacy_plan_code(
        self,
        plan_code: str | None,
    ) -> str:
        if not plan_code:
            return "monthly"
        normalized = plan_code.strip().lower()
        return self.LEGACY_PLAN_CODE_TO_BILLING_CYCLE.get(normalized, "monthly")
