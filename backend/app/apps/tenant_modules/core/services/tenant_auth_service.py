from app.apps.tenant_modules.core.models.user import User
from app.common.security.password_service import verify_password


class TenantAuthService:
    def login(self, tenant_db, email: str, password: str) -> User | None:
        user = (
            tenant_db.query(User)
            .filter(User.email == email)
            .first()
        )

        if not user:
            return None

        if not user.is_active:
            return None

        if not verify_password(password, user.password_hash):
            return None

        return user