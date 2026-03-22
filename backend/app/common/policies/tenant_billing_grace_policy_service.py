from dataclasses import dataclass

from app.common.config.settings import settings
from app.common.policies.tenant_plan_policy_service import TenantPlanPolicyService


@dataclass(frozen=True)
class TenantBillingGracePolicy:
    read_requests_per_minute: int | None = None
    write_requests_per_minute: int | None = None
    enabled_modules: tuple[str, ...] | None = None
    module_limits: dict[str, int] | None = None


class TenantBillingGracePolicyService:
    def __init__(
        self,
        grace_rate_limits: str | None = None,
        grace_enabled_modules: str | None = None,
        grace_module_limits: str | None = None,
    ) -> None:
        self.grace_rate_limits = (
            grace_rate_limits
            if grace_rate_limits is not None
            else settings.TENANT_BILLING_GRACE_RATE_LIMITS
        )
        self.grace_enabled_modules = (
            grace_enabled_modules
            if grace_enabled_modules is not None
            else settings.TENANT_BILLING_GRACE_ENABLED_MODULES
        )
        self.grace_module_limits = (
            grace_module_limits
            if grace_module_limits is not None
            else settings.TENANT_BILLING_GRACE_MODULE_LIMITS
        )

    def get_policy(self) -> TenantBillingGracePolicy | None:
        rate_limits = self.parse_grace_rate_limits()
        enabled_modules = self.parse_grace_enabled_modules()
        module_limits = self.parse_grace_module_limits()

        if rate_limits is None and enabled_modules is None and module_limits is None:
            return None

        read_limit, write_limit = (
            rate_limits if rate_limits is not None else (None, None)
        )
        return TenantBillingGracePolicy(
            read_requests_per_minute=read_limit,
            write_requests_per_minute=write_limit,
            enabled_modules=enabled_modules,
            module_limits=module_limits,
        )

    def parse_grace_rate_limits(self) -> tuple[int, int] | None:
        raw_value = (self.grace_rate_limits or "").strip()
        if not raw_value or ":" not in raw_value:
            return None

        raw_read_limit, raw_write_limit = raw_value.split(":", 1)
        try:
            read_limit = int(raw_read_limit.strip())
            write_limit = int(raw_write_limit.strip())
        except ValueError:
            return None

        if read_limit < 0 or write_limit < 0:
            return None

        return (read_limit, write_limit)

    def parse_grace_enabled_modules(self) -> tuple[str, ...] | None:
        raw_value = (self.grace_enabled_modules or "").strip()
        if not raw_value:
            return None

        modules = sorted(
            {
                module.strip().lower()
                for module in raw_value.split(",")
                if module and module.strip()
            }
        )
        if not modules:
            return None

        if "all" in modules:
            return ("all",)

        invalid = set(modules) - TenantPlanPolicyService.VALID_MODULES
        if invalid:
            return None

        return tuple(modules)

    def parse_grace_module_limits(self) -> dict[str, int] | None:
        parsed = TenantPlanPolicyService(
            plan_module_limits=f"grace={self.grace_module_limits or ''}"
        ).parse_plan_module_limits()
        return parsed.get("grace")
