from app.apps.tenant_modules.finance.services.finance_service import FinanceService
from app.apps.tenant_modules.core.services.tenant_data_service import TenantDataService
from app.common.policies.module_limit_catalog import (
    CORE_USERS_ROLE_LIMIT_KEYS,
    FINANCE_ENTRIES_MONTHLY_TYPE_LIMIT_KEYS,
)


class TenantModuleUsageService:
    ROLE_USAGE_ORDER = tuple(CORE_USERS_ROLE_LIMIT_KEYS.keys())
    FINANCE_MONTHLY_TYPE_USAGE_ORDER = tuple(
        FINANCE_ENTRIES_MONTHLY_TYPE_LIMIT_KEYS.keys()
    )

    def __init__(
        self,
        finance_service: FinanceService | None = None,
        tenant_data_service: TenantDataService | None = None,
    ) -> None:
        self.finance_service = finance_service or FinanceService()
        self.tenant_data_service = tenant_data_service or TenantDataService()

    def list_usage(
        self,
        tenant_db,
        *,
        effective_module_limits: dict[str, int] | None = None,
        effective_module_limit_sources: dict[str, str] | None = None,
    ) -> list[dict]:
        effective_module_limits = effective_module_limits or {}
        effective_module_limit_sources = effective_module_limit_sources or {}

        finance_usage = self.finance_service.get_usage(
            tenant_db,
            max_entries=effective_module_limits.get(FinanceService.MODULE_LIMIT_KEY),
        )
        finance_monthly_usage = self.finance_service.get_monthly_usage(
            tenant_db,
            max_entries=effective_module_limits.get(
                FinanceService.MONTHLY_MODULE_LIMIT_KEY
            ),
        )
        finance_monthly_type_rows = []
        for movement_type in self.FINANCE_MONTHLY_TYPE_USAGE_ORDER:
            usage = self.finance_service.get_monthly_usage_by_type(
                tenant_db,
                movement_type=movement_type,
                max_entries=effective_module_limits.get(
                    FinanceService.MONTHLY_TYPE_MODULE_LIMIT_KEYS[movement_type]
                ),
            )
            if usage["used_entries"] <= 0 and usage["max_entries"] is None:
                continue
            finance_monthly_type_rows.append(
                self._build_usage_row(
                    module_name="finance",
                    module_key=usage["module_key"],
                    used_units=usage["used_entries"],
                    max_units=usage["max_entries"],
                    remaining_units=usage["remaining_entries"],
                    unlimited=usage["unlimited"],
                    at_limit=usage["at_limit"],
                    limit_source=effective_module_limit_sources.get(
                        usage["module_key"]
                    ),
                )
            )
        user_usage = self.tenant_data_service.get_user_usage(
            tenant_db,
            max_users=effective_module_limits.get(TenantDataService.MODULE_LIMIT_KEY),
        )
        active_user_usage = self.tenant_data_service.get_active_user_usage(
            tenant_db,
            max_active_users=effective_module_limits.get(
                TenantDataService.ACTIVE_MODULE_LIMIT_KEY
            ),
        )
        monthly_user_usage = self.tenant_data_service.get_monthly_user_usage(
            tenant_db,
            max_users=effective_module_limits.get(
                TenantDataService.MONTHLY_MODULE_LIMIT_KEY
            ),
        )
        role_usage_rows = []
        for role in self.ROLE_USAGE_ORDER:
            usage = self.tenant_data_service.get_role_user_usage(
                tenant_db,
                role=role,
                max_users=effective_module_limits.get(
                    TenantDataService.ROLE_LIMIT_KEYS[role]
                ),
            )
            if usage["used_units"] <= 0 and usage["max_units"] is None:
                continue
            role_usage_rows.append(
                self._build_usage_row(
                    module_name="core",
                    module_key=usage["module_key"],
                    used_units=usage["used_units"],
                    max_units=usage["max_units"],
                    remaining_units=usage["remaining_units"],
                    unlimited=usage["unlimited"],
                    at_limit=usage["at_limit"],
                    limit_source=effective_module_limit_sources.get(
                        usage["module_key"]
                    ),
                )
            )

        return [
            self._build_usage_row(
                module_name="core",
                module_key=user_usage["module_key"],
                used_units=user_usage["used_units"],
                max_units=user_usage["max_units"],
                remaining_units=user_usage["remaining_units"],
                unlimited=user_usage["unlimited"],
                at_limit=user_usage["at_limit"],
                limit_source=effective_module_limit_sources.get(
                    TenantDataService.MODULE_LIMIT_KEY
                ),
            ),
            self._build_usage_row(
                module_name="core",
                module_key=active_user_usage["module_key"],
                used_units=active_user_usage["used_units"],
                max_units=active_user_usage["max_units"],
                remaining_units=active_user_usage["remaining_units"],
                unlimited=active_user_usage["unlimited"],
                at_limit=active_user_usage["at_limit"],
                limit_source=effective_module_limit_sources.get(
                    TenantDataService.ACTIVE_MODULE_LIMIT_KEY
                ),
            ),
            self._build_usage_row(
                module_name="core",
                module_key=monthly_user_usage["module_key"],
                used_units=monthly_user_usage["used_units"],
                max_units=monthly_user_usage["max_units"],
                remaining_units=monthly_user_usage["remaining_units"],
                unlimited=monthly_user_usage["unlimited"],
                at_limit=monthly_user_usage["at_limit"],
                limit_source=effective_module_limit_sources.get(
                    TenantDataService.MONTHLY_MODULE_LIMIT_KEY
                ),
            ),
            *role_usage_rows,
            self._build_usage_row(
                module_name="finance",
                module_key=finance_usage["module_key"],
                used_units=finance_usage["used_entries"],
                max_units=finance_usage["max_entries"],
                remaining_units=finance_usage["remaining_entries"],
                unlimited=finance_usage["unlimited"],
                at_limit=finance_usage["at_limit"],
                limit_source=effective_module_limit_sources.get(
                    FinanceService.MODULE_LIMIT_KEY
                ),
            ),
            self._build_usage_row(
                module_name="finance",
                module_key=finance_monthly_usage["module_key"],
                used_units=finance_monthly_usage["used_entries"],
                max_units=finance_monthly_usage["max_entries"],
                remaining_units=finance_monthly_usage["remaining_entries"],
                unlimited=finance_monthly_usage["unlimited"],
                at_limit=finance_monthly_usage["at_limit"],
                limit_source=effective_module_limit_sources.get(
                    FinanceService.MONTHLY_MODULE_LIMIT_KEY
                ),
            ),
            *finance_monthly_type_rows,
        ]

    def _build_usage_row(
        self,
        *,
        module_name: str,
        module_key: str,
        used_units: int,
        max_units: int | None,
        remaining_units: int | None,
        unlimited: bool,
        at_limit: bool,
        limit_source: str | None,
    ) -> dict:
        return {
            "module_name": module_name,
            "module_key": module_key,
            "used_units": used_units,
            "max_units": max_units,
            "remaining_units": remaining_units,
            "unlimited": unlimited,
            "at_limit": at_limit,
            "limit_source": limit_source,
        }
