from sqlalchemy.orm import Session

from app.apps.platform_control.models.platform_user import PlatformUser
from app.apps.platform_control.repositories.platform_user_repository import (
    PlatformUserRepository,
)
from app.common.security.password_service import hash_password, verify_password


class PlatformRootAccountService:
    def __init__(
        self,
        platform_user_repository: PlatformUserRepository | None = None,
    ) -> None:
        self.platform_user_repository = (
            platform_user_repository or PlatformUserRepository()
        )

    def has_active_superadmin(self, db: Session) -> bool:
        return self.platform_user_repository.count_active_by_role(db, "superadmin") > 0

    def bootstrap_initial_superadmin(
        self,
        db: Session,
        *,
        full_name: str,
        email: str,
        password: str,
    ) -> PlatformUser:
        normalized_name = full_name.strip()
        normalized_email = email.strip().lower()
        normalized_password = password.strip()

        if not normalized_name:
            raise ValueError("Initial superadmin full name is required")
        if not normalized_email:
            raise ValueError("Initial superadmin email is required")
        if not normalized_password:
            raise ValueError("Initial superadmin password is required")

        existing = self.platform_user_repository.get_by_email(db, normalized_email)
        if existing is not None:
            existing.full_name = normalized_name
            existing.password_hash = hash_password(normalized_password)
            existing.role = "superadmin"
            existing.is_active = True
            return self.platform_user_repository.save(db, existing)

        user = PlatformUser(
            full_name=normalized_name,
            email=normalized_email,
            password_hash=hash_password(normalized_password),
            role="superadmin",
            is_active=True,
        )
        return self.platform_user_repository.save(db, user)

    def get_recovery_status(self, db: Session, *, recovery_key_hash: str) -> dict:
        has_active_superadmin = self.has_active_superadmin(db)
        return {
            "has_active_superadmin": has_active_superadmin,
            "recovery_configured": bool(recovery_key_hash.strip()),
            "recovery_available": bool(recovery_key_hash.strip()) and not has_active_superadmin,
        }

    def recover_root_account(
        self,
        db: Session,
        *,
        recovery_key_hash: str,
        recovery_key: str,
        full_name: str,
        email: str,
        password: str,
    ) -> PlatformUser:
        if not recovery_key_hash.strip():
            raise ValueError("Root account recovery is not configured")
        if self.has_active_superadmin(db):
            raise ValueError(
                "Root account recovery is only available when there is no active superadmin"
            )

        normalized_name = full_name.strip()
        normalized_email = email.strip().lower()
        normalized_password = password.strip()
        normalized_recovery_key = recovery_key.strip()

        if not normalized_recovery_key:
            raise ValueError("Recovery key is required")
        if not normalized_name:
            raise ValueError("Root account full name is required")
        if not normalized_email:
            raise ValueError("Root account email is required")
        if not normalized_password:
            raise ValueError("Root account password is required")
        if not verify_password(normalized_recovery_key, recovery_key_hash):
            raise ValueError("Invalid recovery key")

        existing = self.platform_user_repository.get_by_email(db, normalized_email)
        if existing is not None:
            existing.full_name = normalized_name
            existing.password_hash = hash_password(normalized_password)
            existing.role = "superadmin"
            existing.is_active = True
            return self.platform_user_repository.save(db, existing)

        user = PlatformUser(
            full_name=normalized_name,
            email=normalized_email,
            password_hash=hash_password(normalized_password),
            role="superadmin",
            is_active=True,
        )
        return self.platform_user_repository.save(db, user)
