from app.apps.platform_control.services.tenant_service import TenantService
from app.common.policies.module_limit_catalog import list_module_limit_capabilities
from app.common.policies.tenant_plan_policy_service import TenantPlanPolicyService
from app.common.config.settings import settings


class PlatformCapabilityService:
    BILLING_PROVIDERS = ("stripe",)
    BILLING_SYNC_PROCESSING_RESULTS = (
        "applied",
        "duplicate",
        "ignored",
        "reconciled",
    )
    PROVISIONING_DISPATCH_BACKENDS = ("database", "broker")

    def __init__(
        self,
        tenant_service: TenantService | None = None,
        tenant_plan_policy_service: TenantPlanPolicyService | None = None,
    ):
        self.tenant_service = tenant_service or TenantService()
        self.tenant_plan_policy_service = (
            tenant_plan_policy_service or TenantPlanPolicyService()
        )

    def get_catalog(self) -> dict:
        plan_catalog = []
        for plan_code in self.tenant_plan_policy_service.list_plan_codes():
            policy = self.tenant_plan_policy_service.get_policy(plan_code)
            if policy is None:
                continue
            plan_catalog.append(
                {
                    "plan_code": plan_code,
                    "read_requests_per_minute": policy.read_requests_per_minute,
                    "write_requests_per_minute": policy.write_requests_per_minute,
                    "enabled_modules": None
                    if policy.enabled_modules is None
                    else list(policy.enabled_modules),
                    "module_limits": None
                    if policy.module_limits is None
                    else dict(policy.module_limits),
                }
            )
        return {
            "tenant_statuses": sorted(self.tenant_service.VALID_STATUSES),
            "tenant_billing_statuses": sorted(
                self.tenant_service.VALID_BILLING_STATUSES
            ),
            "maintenance_scopes": sorted(
                self.tenant_service.VALID_MAINTENANCE_SCOPES
            ),
            "maintenance_access_modes": sorted(
                self.tenant_service.VALID_MAINTENANCE_ACCESS_MODES
            ),
            "available_plan_codes": self.tenant_plan_policy_service.list_plan_codes(),
            "plan_modules": sorted(self.tenant_plan_policy_service.VALID_MODULES),
            "plan_catalog": plan_catalog,
            "supported_module_limit_keys": sorted(
                self.tenant_plan_policy_service.VALID_MODULE_LIMIT_KEYS
            ),
            "module_limit_capabilities": list_module_limit_capabilities(),
            "billing_providers": list(self.BILLING_PROVIDERS),
            "billing_sync_processing_results": list(
                self.BILLING_SYNC_PROCESSING_RESULTS
            ),
            "current_provisioning_dispatch_backend": (
                settings.PROVISIONING_DISPATCH_BACKEND.strip().lower()
            ),
            "provisioning_dispatch_backends": list(
                self.PROVISIONING_DISPATCH_BACKENDS
            ),
        }
