import json
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.apps.tenant_modules.core.models.tenant_info import TenantInfo
from app.apps.tenant_modules.core.models.user import User
from app.apps.tenant_modules.finance.models import (
    FinanceAccount,
    FinanceCategory,
    FinanceCurrency,
)
from app.apps.tenant_modules.core.repositories.tenant_info_repository import (
    TenantInfoRepository,
)
from app.apps.tenant_modules.core.repositories.user_repository import UserRepository
from app.apps.tenant_modules.core.permissions import (
    normalize_permission_codes,
    resolve_effective_permissions,
)
from app.common.timezone_utils import normalize_timezone, resolve_effective_timezone
from app.common.policies.module_limit_catalog import (
    CORE_USERS_ACTIVE_LIMIT_KEY,
    CORE_USERS_LIMIT_KEY,
    CORE_USERS_MONTHLY_LIMIT_KEY,
    CORE_USERS_ROLE_LIMIT_KEYS,
)
from app.common.security.password_service import hash_password


class TenantUserLimitExceededError(ValueError):
    pass


class TenantDataService:
    MODULE_LIMIT_KEY = CORE_USERS_LIMIT_KEY
    ACTIVE_MODULE_LIMIT_KEY = CORE_USERS_ACTIVE_LIMIT_KEY
    MONTHLY_MODULE_LIMIT_KEY = CORE_USERS_MONTHLY_LIMIT_KEY
    ROLE_LIMIT_KEYS = CORE_USERS_ROLE_LIMIT_KEYS
    MAINTENANCE_FINANCE_SYNC_MODES = {"manual", "auto_on_close"}

    def __init__(
        self,
        tenant_info_repository: TenantInfoRepository | None = None,
        user_repository: UserRepository | None = None,
    ):
        self.tenant_info_repository = (
            tenant_info_repository or TenantInfoRepository()
        )
        self.user_repository = user_repository or UserRepository()

    def get_tenant_info(self, tenant_db: Session) -> TenantInfo | None:
        return self.tenant_info_repository.get_first(tenant_db)

    def get_effective_timezone(
        self,
        tenant_db: Session,
        *,
        user: User | None = None,
        tenant_info: TenantInfo | None = None,
    ) -> str:
        resolved_tenant = tenant_info or self.get_tenant_info(tenant_db)
        return resolve_effective_timezone(
            getattr(resolved_tenant, "timezone", None),
            getattr(user, "timezone", None),
        )

    def update_tenant_timezone(self, tenant_db: Session, timezone: str) -> TenantInfo:
        tenant_info = self.tenant_info_repository.get_first(tenant_db)
        if not tenant_info:
            raise ValueError("Informacion tenant no encontrada")

        tenant_info.timezone = normalize_timezone(timezone)
        tenant_db.add(tenant_info)
        tenant_db.commit()
        tenant_db.refresh(tenant_info)
        return tenant_info

    def update_maintenance_finance_sync_policy(
        self,
        tenant_db: Session,
        *,
        sync_mode: str,
        auto_sync_income: bool,
        auto_sync_expense: bool,
        income_account_id: int | None,
        expense_account_id: int | None,
        income_category_id: int | None,
        expense_category_id: int | None,
        currency_id: int | None,
    ) -> TenantInfo:
        tenant_info = self.tenant_info_repository.get_first(tenant_db)
        if not tenant_info:
            raise ValueError("Informacion tenant no encontrada")

        normalized_mode = (sync_mode or "").strip().lower()
        if normalized_mode not in self.MAINTENANCE_FINANCE_SYNC_MODES:
            raise ValueError("El modo de sincronizacion maintenance-finance no es valido")
        if normalized_mode == "auto_on_close" and not auto_sync_income and not auto_sync_expense:
            raise ValueError(
                "La sincronizacion automatica al cerrar requiere activar ingreso, egreso o ambos"
            )

        if auto_sync_income and income_account_id is not None:
            self._get_finance_account_or_raise(tenant_db, income_account_id)
        if auto_sync_expense and expense_account_id is not None:
            self._get_finance_account_or_raise(tenant_db, expense_account_id)
        if income_category_id is not None:
            self._get_finance_category_or_raise(tenant_db, income_category_id)
        if expense_category_id is not None:
            self._get_finance_category_or_raise(tenant_db, expense_category_id)
        if currency_id is not None:
            self._get_finance_currency_or_raise(tenant_db, currency_id)

        tenant_info.maintenance_finance_sync_mode = normalized_mode
        tenant_info.maintenance_finance_auto_sync_income = auto_sync_income
        tenant_info.maintenance_finance_auto_sync_expense = auto_sync_expense
        tenant_info.maintenance_finance_income_account_id = income_account_id
        tenant_info.maintenance_finance_expense_account_id = expense_account_id
        tenant_info.maintenance_finance_income_category_id = income_category_id
        tenant_info.maintenance_finance_expense_category_id = expense_category_id
        tenant_info.maintenance_finance_currency_id = currency_id
        tenant_db.add(tenant_info)
        tenant_db.commit()
        tenant_db.refresh(tenant_info)
        return tenant_info

    def get_maintenance_finance_sync_policy(
        self,
        tenant_db: Session,
        *,
        tenant_info: TenantInfo | None = None,
    ) -> dict:
        resolved = tenant_info or self.get_tenant_info(tenant_db)
        if resolved is None:
            raise ValueError("Informacion tenant no encontrada")
        configured_mode = getattr(
            resolved,
            "maintenance_finance_sync_mode",
            "auto_on_close",
        ) or "auto_on_close"
        auto_sync_income = bool(
            getattr(resolved, "maintenance_finance_auto_sync_income", True)
        )
        auto_sync_expense = bool(
            getattr(resolved, "maintenance_finance_auto_sync_expense", True)
        )
        if configured_mode == "manual":
            has_explicit_defaults = any(
                [
                    getattr(resolved, "maintenance_finance_income_account_id", None),
                    getattr(resolved, "maintenance_finance_expense_account_id", None),
                    getattr(resolved, "maintenance_finance_income_category_id", None),
                    getattr(resolved, "maintenance_finance_expense_category_id", None),
                    getattr(resolved, "maintenance_finance_currency_id", None),
                ]
            )
            if not has_explicit_defaults:
                configured_mode = "auto_on_close"
        if configured_mode == "auto_on_close" and not auto_sync_income and not auto_sync_expense:
            auto_sync_income = True
            auto_sync_expense = True

        return {
            "maintenance_finance_sync_mode": configured_mode,
            "maintenance_finance_auto_sync_income": auto_sync_income,
            "maintenance_finance_auto_sync_expense": auto_sync_expense,
            "maintenance_finance_income_account_id": getattr(
                resolved,
                "maintenance_finance_income_account_id",
                None,
            ),
            "maintenance_finance_expense_account_id": getattr(
                resolved,
                "maintenance_finance_expense_account_id",
                None,
            ),
            "maintenance_finance_income_category_id": getattr(
                resolved,
                "maintenance_finance_income_category_id",
                None,
            ),
            "maintenance_finance_expense_category_id": getattr(
                resolved,
                "maintenance_finance_expense_category_id",
                None,
            ),
            "maintenance_finance_currency_id": getattr(
                resolved,
                "maintenance_finance_currency_id",
                None,
            ),
        }

    def get_user_by_id(self, tenant_db: Session, user_id: int) -> User | None:
        return self.user_repository.get_by_id(tenant_db, user_id)

    def get_user_granted_permissions(self, user: User | None) -> list[str]:
        return self._parse_permissions_json(
            None if user is None else getattr(user, "granted_permissions_json", None)
        )

    def get_user_revoked_permissions(self, user: User | None) -> list[str]:
        return self._parse_permissions_json(
            None if user is None else getattr(user, "revoked_permissions_json", None)
        )

    def get_effective_permissions(
        self,
        user: User | None,
        *,
        fallback_role: str | None = None,
    ) -> list[str]:
        if user is None and not fallback_role:
            return []
        role = getattr(user, "role", None) or fallback_role or ""
        return sorted(
            resolve_effective_permissions(
                role,
                granted_permissions=self.get_user_granted_permissions(user),
                revoked_permissions=self.get_user_revoked_permissions(user),
            )
        )

    def _get_finance_account_or_raise(self, tenant_db: Session, account_id: int) -> FinanceAccount:
        account = (
            tenant_db.query(FinanceAccount)
            .filter(FinanceAccount.id == account_id)
            .first()
        )
        if account is None:
            raise ValueError("La cuenta financiera seleccionada no existe")
        return account

    def _get_finance_category_or_raise(
        self,
        tenant_db: Session,
        category_id: int,
    ) -> FinanceCategory:
        category = (
            tenant_db.query(FinanceCategory)
            .filter(FinanceCategory.id == category_id)
            .first()
        )
        if category is None:
            raise ValueError("La categoria financiera seleccionada no existe")
        return category

    def _get_finance_currency_or_raise(
        self,
        tenant_db: Session,
        currency_id: int,
    ) -> FinanceCurrency:
        currency = (
            tenant_db.query(FinanceCurrency)
            .filter(FinanceCurrency.id == currency_id)
            .first()
        )
        if currency is None:
            raise ValueError("La moneda financiera seleccionada no existe")
        return currency

    def list_users(self, tenant_db: Session) -> list[User]:
        return self.user_repository.list_all(tenant_db)

    def get_user_usage(
        self,
        tenant_db: Session,
        *,
        max_users: int | None = None,
    ) -> dict:
        used_units = self.user_repository.count_all(tenant_db)
        unlimited = max_users is None or max_users <= 0
        effective_max_units = None if unlimited else max_users
        remaining_units = (
            None
            if effective_max_units is None
            else max(effective_max_units - used_units, 0)
        )

        return {
            "module_key": self.MODULE_LIMIT_KEY,
            "used_units": used_units,
            "max_units": effective_max_units,
            "remaining_units": remaining_units,
            "unlimited": unlimited,
            "at_limit": False
            if effective_max_units is None
            else used_units >= effective_max_units,
        }

    def get_active_user_usage(
        self,
        tenant_db: Session,
        *,
        max_active_users: int | None = None,
    ) -> dict:
        used_units = self.user_repository.count_active(tenant_db)
        unlimited = max_active_users is None or max_active_users <= 0
        effective_max_units = None if unlimited else max_active_users
        remaining_units = (
            None
            if effective_max_units is None
            else max(effective_max_units - used_units, 0)
        )

        return {
            "module_key": self.ACTIVE_MODULE_LIMIT_KEY,
            "used_units": used_units,
            "max_units": effective_max_units,
            "remaining_units": remaining_units,
            "unlimited": unlimited,
            "at_limit": False
            if effective_max_units is None
            else used_units >= effective_max_units,
        }

    def get_monthly_user_usage(
        self,
        tenant_db: Session,
        *,
        max_users: int | None = None,
    ) -> dict:
        used_units = self.user_repository.count_created_since(
            tenant_db,
            self._get_current_month_start(),
        )
        unlimited = max_users is None or max_users <= 0
        effective_max_units = None if unlimited else max_users
        remaining_units = (
            None
            if effective_max_units is None
            else max(effective_max_units - used_units, 0)
        )

        return {
            "module_key": self.MONTHLY_MODULE_LIMIT_KEY,
            "used_units": used_units,
            "max_units": effective_max_units,
            "remaining_units": remaining_units,
            "unlimited": unlimited,
            "at_limit": False
            if effective_max_units is None
            else used_units >= effective_max_units,
        }

    def get_role_user_usage(
        self,
        tenant_db: Session,
        *,
        role: str,
        max_users: int | None = None,
    ) -> dict:
        normalized_role = role.strip().lower()
        module_key = self.ROLE_LIMIT_KEYS[normalized_role]
        used_units = self.user_repository.count_by_role(tenant_db, normalized_role)
        unlimited = max_users is None or max_users <= 0
        effective_max_units = None if unlimited else max_users
        remaining_units = (
            None
            if effective_max_units is None
            else max(effective_max_units - used_units, 0)
        )

        return {
            "module_key": module_key,
            "used_units": used_units,
            "max_units": effective_max_units,
            "remaining_units": remaining_units,
            "unlimited": unlimited,
            "at_limit": False
            if effective_max_units is None
            else used_units >= effective_max_units,
        }

    def create_user(
        self,
        tenant_db: Session,
        full_name: str,
        email: str,
        password: str,
        role: str,
        is_active: bool = True,
        timezone: str | None = None,
        granted_permissions: list[str] | None = None,
        revoked_permissions: list[str] | None = None,
        max_users: int | None = None,
        max_active_users: int | None = None,
        max_monthly_users: int | None = None,
        role_module_limits: dict[str, int] | None = None,
    ) -> User:
        normalized_role = role.strip().lower()
        existing = self.user_repository.get_by_email(tenant_db, email)
        if existing:
            raise ValueError("Ya existe un usuario con ese email en el tenant")

        if max_users is not None and max_users > 0:
            current_users = self.user_repository.count_all(tenant_db)
            if current_users >= max_users:
                raise TenantUserLimitExceededError(
                    "El plan actual alcanzo el limite de core.users"
                )

        if is_active and max_active_users is not None and max_active_users > 0:
            current_active_users = self.user_repository.count_active(tenant_db)
            if current_active_users >= max_active_users:
                raise TenantUserLimitExceededError(
                    "El plan actual alcanzo el limite de core.users.active"
                )

        if max_monthly_users is not None and max_monthly_users > 0:
            current_monthly_users = self.user_repository.count_created_since(
                tenant_db,
                self._get_current_month_start(),
            )
            if current_monthly_users >= max_monthly_users:
                raise TenantUserLimitExceededError(
                    "El plan actual alcanzo el limite de core.users.monthly"
                )

        role_limit_key = self.ROLE_LIMIT_KEYS.get(normalized_role)
        role_limit = (
            None
            if role_module_limits is None or role_limit_key is None
            else role_module_limits.get(role_limit_key)
        )
        if role_limit is not None and role_limit > 0:
            current_role_users = self.user_repository.count_by_role(
                tenant_db, normalized_role
            )
            if current_role_users >= role_limit:
                raise TenantUserLimitExceededError(
                    f"El plan actual alcanzo el limite de {role_limit_key}"
                )

        user = User(
            full_name=full_name,
            email=email,
            password_hash=hash_password(password),
            role=normalized_role,
            timezone=normalize_timezone(timezone, allow_none=True),
            granted_permissions_json=self._dump_permissions_json(granted_permissions),
            revoked_permissions_json=self._dump_permissions_json(revoked_permissions),
            is_active=is_active,
        )
        return self.user_repository.save(tenant_db, user)

    def update_user(
        self,
        tenant_db: Session,
        user_id: int,
        full_name: str,
        email: str,
        role: str,
        password: str | None = None,
        timezone: str | None = None,
        granted_permissions: list[str] | None = None,
        revoked_permissions: list[str] | None = None,
        role_module_limits: dict[str, int] | None = None,
    ) -> User:
        user = self.user_repository.get_by_id(tenant_db, user_id)
        if not user:
            raise ValueError("Usuario tenant no encontrado")

        normalized_role = role.strip().lower()
        existing = self.user_repository.get_by_email(tenant_db, email)
        if existing and existing.id != user_id:
            raise ValueError("Ya existe un usuario con ese email en el tenant")

        if normalized_role != user.role:
            role_limit_key = self.ROLE_LIMIT_KEYS.get(normalized_role)
            role_limit = (
                None
                if role_module_limits is None or role_limit_key is None
                else role_module_limits.get(role_limit_key)
            )
            if role_limit is not None and role_limit > 0:
                current_role_users = self.user_repository.count_by_role(
                    tenant_db, normalized_role
                )
                if current_role_users >= role_limit:
                    raise TenantUserLimitExceededError(
                        f"El plan actual alcanzo el limite de {role_limit_key}"
                    )

        if (
            user.role.strip().lower() == "admin"
            and normalized_role != "admin"
            and user.is_active
            and self.user_repository.count_active_by_role(
                tenant_db,
                "admin",
                exclude_user_id=user.id,
            )
            <= 0
        ):
            raise ValueError("Debe quedar al menos un administrador activo en el tenant")

        user.full_name = full_name
        user.email = email
        user.role = normalized_role
        user.timezone = normalize_timezone(timezone, allow_none=True)
        user.granted_permissions_json = self._dump_permissions_json(granted_permissions)
        user.revoked_permissions_json = self._dump_permissions_json(revoked_permissions)

        if password:
            user.password_hash = hash_password(password)

        return self.user_repository.save(tenant_db, user)

    def reset_user_password_by_email(
        self,
        tenant_db: Session,
        *,
        email: str,
        new_password: str,
    ) -> User:
        normalized_email = email.strip()
        normalized_password = new_password.strip()

        if not normalized_email:
            raise ValueError("Tenant user email is required")

        if not normalized_password:
            raise ValueError("Tenant user password is required")

        user = self.user_repository.get_by_email(tenant_db, normalized_email)
        if not user:
            raise ValueError("Tenant user not found")

        user.password_hash = hash_password(normalized_password)
        return self.user_repository.save(tenant_db, user)

    def update_user_status(
        self,
        tenant_db: Session,
        user_id: int,
        is_active: bool,
        actor_user_id: int | None = None,
        max_active_users: int | None = None,
        role_module_limits: dict[str, int] | None = None,
    ) -> User:
        user = self.user_repository.get_by_id(tenant_db, user_id)
        if not user:
            raise ValueError("Usuario tenant no encontrado")

        if actor_user_id is not None and actor_user_id == user.id and not is_active:
            raise ValueError("No puedes desactivar tu propio usuario")

        if (
            user.role.strip().lower() == "admin"
            and user.is_active
            and not is_active
            and self.user_repository.count_active_by_role(
                tenant_db,
                "admin",
                exclude_user_id=user.id,
            )
            <= 0
        ):
            raise ValueError("Debe quedar al menos un administrador activo en el tenant")

        if (
            is_active
            and not user.is_active
            and max_active_users is not None
            and max_active_users > 0
        ):
            current_active_users = self.user_repository.count_active(tenant_db)
            if current_active_users >= max_active_users:
                raise TenantUserLimitExceededError(
                    "El plan actual alcanzo el limite de core.users.active"
                )

        if is_active and not user.is_active:
            role_limit_key = self.ROLE_LIMIT_KEYS.get(user.role.strip().lower())
            role_limit = (
                None
                if role_module_limits is None or role_limit_key is None
                else role_module_limits.get(role_limit_key)
            )
            if role_limit is not None and role_limit > 0:
                current_active_role_users = self.user_repository.count_active_by_role(
                    tenant_db,
                    user.role,
                    exclude_user_id=user.id,
                )
                if current_active_role_users >= role_limit:
                    raise TenantUserLimitExceededError(
                        f"El plan actual alcanzo el limite de {role_limit_key}"
                    )

        user.is_active = is_active
        return self.user_repository.save(tenant_db, user)

    def delete_user(
        self,
        tenant_db: Session,
        *,
        user_id: int,
        actor_user_id: int | None = None,
    ) -> User:
        user = self.user_repository.get_by_id(tenant_db, user_id)
        if not user:
            raise ValueError("Usuario tenant no encontrado")

        if actor_user_id is not None and actor_user_id == user.id:
            raise ValueError("No puedes eliminar tu propio usuario")

        if (
            user.role.strip().lower() == "admin"
            and user.is_active
            and self.user_repository.count_active_by_role(
                tenant_db,
                "admin",
                exclude_user_id=user.id,
            )
            <= 0
        ):
            raise ValueError("Debe quedar al menos un administrador activo en el tenant")

        return self.user_repository.delete(tenant_db, user)

    def _get_current_month_start(self) -> datetime:
        now = datetime.now(timezone.utc)
        return now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    def _parse_permissions_json(self, raw_value: str | None) -> list[str]:
        if not raw_value:
            return []
        try:
            parsed = json.loads(raw_value)
        except (TypeError, ValueError, json.JSONDecodeError):
            return []
        if not isinstance(parsed, list):
            return []
        return normalize_permission_codes(parsed)

    def _dump_permissions_json(self, values: list[str] | None) -> str | None:
        normalized = normalize_permission_codes(values)
        if not normalized:
            return None
        return json.dumps(normalized, ensure_ascii=True)
