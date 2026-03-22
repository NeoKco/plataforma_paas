from sqlalchemy.orm import Session

from app.apps.platform_control.models.platform_user import PlatformUser
from app.apps.platform_control.repositories.platform_user_repository import (
    PlatformUserRepository,
)
from app.common.security.password_service import verify_password


class PlatformAuthService:
    def __init__(
        self,
        platform_user_repository: PlatformUserRepository | None = None,
    ):
        self.platform_user_repository = (
            platform_user_repository or PlatformUserRepository()
        )

    def login(self, db: Session, email: str, password: str) -> PlatformUser | None:
        user = self.platform_user_repository.get_by_email(db, email)

        if not user:
            return None

        if not user.is_active:
            return None

        if not verify_password(password, user.password_hash):
            return None

        return user
