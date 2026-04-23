from dataclasses import dataclass

from app.common.config.settings import settings
from app.common.policies.module_limit_catalog import (
    SUPPORTED_MODULE_LIMIT_KEYS,
    VALID_PLAN_MODULES,
)


@dataclass(frozen=True)
class TenantPlanRateLimitPolicy:
    plan_code: str
    read_requests_per_minute: int | None = None
    write_requests_per_minute: int | None = None
    enabled_modules: tuple[str, ...] | None = None
    module_limits: dict[str, int] | None = None


class TenantPlanPolicyService:
    VALID_MODULES = VALID_PLAN_MODULES
    VALID_MODULE_LIMIT_KEYS = SUPPORTED_MODULE_LIMIT_KEYS
    MODULE_DEPENDENCIES = {
        "maintenance": ("core",),
        "crm": ("core",),
    }
    MODULE_DEPENDENCY_REASONS = {
        "maintenance": "Maintenance depende de business-core y no debe duplicarlo.",
        "crm": "CRM depende de business-core para reutilizar clientes y base compartida.",
    }

    def __init__(
        self,
        plan_rate_limits: str | None = None,
        plan_enabled_modules: str | None = None,
        plan_module_limits: str | None = None,
    ):
        self.plan_rate_limits = (
            plan_rate_limits
            if plan_rate_limits is not None
            else settings.TENANT_PLAN_RATE_LIMITS
        )
        self.plan_enabled_modules = (
            plan_enabled_modules
            if plan_enabled_modules is not None
            else settings.TENANT_PLAN_ENABLED_MODULES
        )
        self.plan_module_limits = (
            plan_module_limits
            if plan_module_limits is not None
            else settings.TENANT_PLAN_MODULE_LIMITS
        )

    def get_policy(
        self,
        plan_code: str | None,
    ) -> TenantPlanRateLimitPolicy | None:
        if not plan_code:
            return None

        limits = self.parse_plan_rate_limits()
        enabled_modules = self.parse_plan_enabled_modules()
        module_limits = self.parse_plan_module_limits()
        normalized_plan_code = plan_code.strip().lower()
        if (
            normalized_plan_code not in limits
            and normalized_plan_code not in enabled_modules
            and normalized_plan_code not in module_limits
        ):
            return None

        read_limit, write_limit = limits.get(normalized_plan_code, (None, None))
        return TenantPlanRateLimitPolicy(
            plan_code=normalized_plan_code,
            read_requests_per_minute=read_limit,
            write_requests_per_minute=write_limit,
            enabled_modules=enabled_modules.get(normalized_plan_code),
            module_limits=module_limits.get(normalized_plan_code),
        )

    def has_plan(self, plan_code: str) -> bool:
        return self.get_policy(plan_code) is not None

    def list_plan_codes(self) -> list[str]:
        plan_codes = set(self.parse_plan_rate_limits().keys())
        plan_codes.update(self.parse_plan_enabled_modules().keys())
        plan_codes.update(self.parse_plan_module_limits().keys())
        return sorted(plan_codes)

    def get_enabled_modules(self, plan_code: str | None) -> list[str] | None:
        policy = self.get_policy(plan_code)
        if policy is None or policy.enabled_modules is None:
            return None
        return list(policy.enabled_modules)

    def get_module_limits(self, plan_code: str | None) -> dict[str, int] | None:
        policy = self.get_policy(plan_code)
        if policy is None or policy.module_limits is None:
            return None
        return dict(policy.module_limits)

    def get_module_dependencies(self) -> dict[str, tuple[str, ...]]:
        return {
            module_key: tuple(required_modules)
            for module_key, required_modules in self.MODULE_DEPENDENCIES.items()
        }

    def list_module_dependency_catalog(self) -> list[dict]:
        catalog: list[dict] = []
        for module_key in sorted(self.MODULE_DEPENDENCIES):
            catalog.append(
                {
                    "module_key": module_key,
                    "requires_modules": list(self.MODULE_DEPENDENCIES[module_key]),
                    "reason": self.MODULE_DEPENDENCY_REASONS.get(module_key),
                }
            )
        return catalog

    def parse_plan_rate_limits(self) -> dict[str, tuple[int, int]]:
        parsed: dict[str, tuple[int, int]] = {}
        raw_value = (self.plan_rate_limits or "").strip()
        if not raw_value:
            return parsed

        for item in raw_value.split(";"):
            chunk = item.strip()
            if not chunk or "=" not in chunk:
                continue

            plan_code, limits = chunk.split("=", 1)
            normalized_plan_code = plan_code.strip().lower()
            if not normalized_plan_code or ":" not in limits:
                continue

            raw_read_limit, raw_write_limit = limits.split(":", 1)
            try:
                read_limit = int(raw_read_limit.strip())
                write_limit = int(raw_write_limit.strip())
            except ValueError:
                continue

            if read_limit < 0 or write_limit < 0:
                continue

            parsed[normalized_plan_code] = (read_limit, write_limit)

        return parsed

    def parse_plan_enabled_modules(self) -> dict[str, tuple[str, ...]]:
        parsed: dict[str, tuple[str, ...]] = {}
        raw_value = (self.plan_enabled_modules or "").strip()
        if not raw_value:
            return parsed

        for item in raw_value.split(";"):
            chunk = item.strip()
            if not chunk or "=" not in chunk:
                continue

            plan_code, raw_modules = chunk.split("=", 1)
            normalized_plan_code = plan_code.strip().lower()
            if not normalized_plan_code:
                continue

            modules = sorted(
                {
                    module.strip().lower()
                    for module in raw_modules.split(",")
                    if module and module.strip()
                }
            )
            if not modules:
                continue

            if "all" in modules:
                parsed[normalized_plan_code] = ("all",)
                continue

            if set(modules) - self.VALID_MODULES:
                continue

            parsed[normalized_plan_code] = tuple(modules)

        return parsed

    def parse_plan_module_limits(self) -> dict[str, dict[str, int]]:
        parsed: dict[str, dict[str, int]] = {}
        raw_value = (self.plan_module_limits or "").strip()
        if not raw_value:
            return parsed

        for item in raw_value.split(";"):
            chunk = item.strip()
            if not chunk or "=" not in chunk:
                continue

            plan_code, raw_limits = chunk.split("=", 1)
            normalized_plan_code = plan_code.strip().lower()
            if not normalized_plan_code:
                continue

            parsed_limits = self._parse_module_limit_pairs(raw_limits)
            if not parsed_limits:
                continue

            parsed[normalized_plan_code] = parsed_limits

        return parsed

    def _parse_module_limit_pairs(self, raw_value: str) -> dict[str, int]:
        parsed: dict[str, int] = {}
        for item in raw_value.split(","):
            chunk = item.strip()
            if not chunk or ":" not in chunk:
                continue

            raw_key, raw_limit = chunk.split(":", 1)
            normalized_key = raw_key.strip().lower()
            if normalized_key not in self.VALID_MODULE_LIMIT_KEYS:
                continue

            try:
                limit = int(raw_limit.strip())
            except ValueError:
                continue

            if limit < 0:
                continue

            parsed[normalized_key] = limit

        return parsed
