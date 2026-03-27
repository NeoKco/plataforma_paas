from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.apps.tenant_modules.core.models.tenant_info import TenantInfo
from app.apps.tenant_modules.core.models.user import User
from app.apps.tenant_modules.core.repositories.tenant_info_repository import (
    TenantInfoRepository,
)
from app.apps.tenant_modules.core.repositories.user_repository import UserRepository
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

    def get_user_by_id(self, tenant_db: Session, user_id: int) -> User | None:
        return self.user_repository.get_by_id(tenant_db, user_id)

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

        user.full_name = full_name
        user.email = email
        user.role = normalized_role

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

    def _get_current_month_start(self) -> datetime:
        now = datetime.now(timezone.utc)
        return now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
