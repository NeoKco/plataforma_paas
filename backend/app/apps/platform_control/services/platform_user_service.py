from sqlalchemy.orm import Session

from app.apps.platform_control.models.platform_user import PlatformUser
from app.apps.platform_control.repositories.platform_user_repository import (
    PlatformUserRepository,
)
from app.common.security.password_service import hash_password


class PlatformUserService:
    ALLOWED_ROLES = {"superadmin", "admin", "support"}

    def __init__(
        self,
        platform_user_repository: PlatformUserRepository | None = None,
    ) -> None:
        self.platform_user_repository = (
            platform_user_repository or PlatformUserRepository()
        )

    def _has_other_active_superadmin(
        self,
        db: Session,
        *,
        current_user: PlatformUser | None = None,
    ) -> bool:
        active_superadmins = self.platform_user_repository.count_active_by_role(
            db,
            "superadmin",
        )
        if (
            current_user
            and current_user.role == "superadmin"
            and current_user.is_active
        ):
            active_superadmins -= 1
        return active_superadmins > 0

    def list_users(self, db: Session) -> list[PlatformUser]:
        return self.platform_user_repository.list_all(db)

    def _assert_actor_can_create_role(
        self,
        *,
        actor_role: str,
        target_role: str,
    ) -> None:
        if actor_role == "superadmin" and target_role in {"admin", "support"}:
            return
        if actor_role == "admin" and target_role == "support":
            return
        if target_role == "superadmin":
            raise ValueError("Superadmin role cannot be assigned from this flow")
        raise ValueError("You do not have permission to create this platform user role")

    def _assert_actor_can_update_user(
        self,
        *,
        actor_role: str,
        user: PlatformUser,
        target_role: str,
    ) -> None:
        if actor_role == "superadmin":
            if user.role == "superadmin" and target_role in self.ALLOWED_ROLES:
                return
            if user.role in {"admin", "support"} and target_role in {"admin", "support"}:
                return
            if target_role == "superadmin":
                raise ValueError("Superadmin role cannot be assigned from this flow")
        if actor_role == "admin" and user.role == "support" and target_role == "support":
            return
        raise ValueError("You do not have permission to manage this platform user")

    def _assert_actor_can_change_status(
        self,
        *,
        actor_role: str,
        user: PlatformUser,
    ) -> None:
        if actor_role == "superadmin":
            return
        if actor_role == "admin" and user.role == "support":
            return
        raise ValueError("You do not have permission to manage this platform user")

    def _assert_actor_can_reset_password(
        self,
        *,
        actor_role: str,
        user: PlatformUser,
    ) -> None:
        if actor_role == "superadmin":
            return
        if actor_role == "admin" and user.role == "support":
            return
        raise ValueError("You do not have permission to manage this platform user")

    def _assert_actor_can_delete_user(
        self,
        *,
        actor_role: str,
        actor_user_id: int | None,
        user: PlatformUser,
    ) -> None:
        if actor_user_id is not None and actor_user_id == user.id:
            raise ValueError("Platform users cannot delete themselves")
        if user.role == "superadmin":
            raise ValueError("Superadmin users cannot be deleted")
        if actor_role == "superadmin" and user.role in {"admin", "support"}:
            return
        if actor_role == "admin" and user.role == "support":
            return
        raise ValueError("You do not have permission to manage this platform user")

    def create_user(
        self,
        db: Session,
        *,
        full_name: str,
        email: str,
        role: str,
        password: str,
        is_active: bool = True,
        actor_role: str = "superadmin",
    ) -> PlatformUser:
        normalized_name = full_name.strip()
        normalized_email = email.strip().lower()
        normalized_role = role.strip().lower()
        normalized_password = password.strip()

        if not normalized_name:
            raise ValueError("Platform user full name is required")
        if not normalized_email:
            raise ValueError("Platform user email is required")
        if not normalized_password:
            raise ValueError("Platform user password is required")
        if normalized_role not in self.ALLOWED_ROLES:
            raise ValueError("Invalid platform user role")
        self._assert_actor_can_create_role(
            actor_role=actor_role.strip().lower(),
            target_role=normalized_role,
        )
        if self.platform_user_repository.get_by_email(db, normalized_email):
            raise ValueError("Platform user email already exists")
        if (
            normalized_role == "superadmin"
            and is_active
            and self._has_other_active_superadmin(db)
        ):
            raise ValueError("Only one active superadmin is allowed")

        user = PlatformUser(
            full_name=normalized_name,
            email=normalized_email,
            role=normalized_role,
            password_hash=hash_password(normalized_password),
            is_active=is_active,
        )
        return self.platform_user_repository.save(db, user)

    def update_user(
        self,
        db: Session,
        *,
        user_id: int,
        full_name: str,
        role: str,
        actor_role: str = "superadmin",
    ) -> PlatformUser:
        user = self.platform_user_repository.get_by_id(db, user_id)
        if not user:
            raise ValueError("Platform user not found")

        normalized_name = full_name.strip()
        normalized_role = role.strip().lower()

        if not normalized_name:
            raise ValueError("Platform user full name is required")
        if normalized_role not in self.ALLOWED_ROLES:
            raise ValueError("Invalid platform user role")
        self._assert_actor_can_update_user(
            actor_role=actor_role.strip().lower(),
            user=user,
            target_role=normalized_role,
        )
        if (
            normalized_role == "superadmin"
            and user.role != "superadmin"
            and user.is_active
            and self._has_other_active_superadmin(db)
        ):
            raise ValueError("Only one active superadmin is allowed")
        if (
            normalized_role == "superadmin"
            and user.role == "superadmin"
            and not user.is_active
            and self._has_other_active_superadmin(db, current_user=user)
        ):
            raise ValueError("Only one active superadmin is allowed")

        if (
            user.role == "superadmin"
            and normalized_role != "superadmin"
            and user.is_active
            and self.platform_user_repository.count_active_by_role(db, "superadmin") <= 1
        ):
            raise ValueError("At least one active superadmin must remain")

        user.full_name = normalized_name
        user.role = normalized_role
        return self.platform_user_repository.save(db, user)

    def set_user_status(
        self,
        db: Session,
        *,
        user_id: int,
        is_active: bool,
        actor_role: str = "superadmin",
    ) -> PlatformUser:
        user = self.platform_user_repository.get_by_id(db, user_id)
        if not user:
            raise ValueError("Platform user not found")

        self._assert_actor_can_change_status(
            actor_role=actor_role.strip().lower(),
            user=user,
        )

        if (
            user.role == "superadmin"
            and not user.is_active
            and is_active
            and self._has_other_active_superadmin(db, current_user=user)
        ):
            raise ValueError("Only one active superadmin is allowed")

        if (
            user.role == "superadmin"
            and user.is_active
            and not is_active
            and self.platform_user_repository.count_active_by_role(db, "superadmin") <= 1
        ):
            raise ValueError("At least one active superadmin must remain")

        user.is_active = is_active
        return self.platform_user_repository.save(db, user)

    def reset_password(
        self,
        db: Session,
        *,
        user_id: int,
        new_password: str,
        actor_role: str = "superadmin",
    ) -> PlatformUser:
        user = self.platform_user_repository.get_by_id(db, user_id)
        if not user:
            raise ValueError("Platform user not found")

        self._assert_actor_can_reset_password(
            actor_role=actor_role.strip().lower(),
            user=user,
        )

        normalized_password = new_password.strip()
        if not normalized_password:
            raise ValueError("Platform user password is required")

        user.password_hash = hash_password(normalized_password)
        return self.platform_user_repository.save(db, user)

    def delete_user(
        self,
        db: Session,
        *,
        user_id: int,
        actor_role: str = "superadmin",
        actor_user_id: int | None = None,
    ) -> PlatformUser:
        user = self.platform_user_repository.get_by_id(db, user_id)
        if not user:
            raise ValueError("Platform user not found")

        self._assert_actor_can_delete_user(
            actor_role=actor_role.strip().lower(),
            actor_user_id=actor_user_id,
            user=user,
        )

        self.platform_user_repository.delete(db, user)
        return user
