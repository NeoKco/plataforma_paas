from sqlalchemy.orm import Session

from app.apps.platform_control.models.platform_user import PlatformUser


class PlatformUserRepository:
    def get_by_email(self, db: Session, email: str) -> PlatformUser | None:
        return (
            db.query(PlatformUser)
            .filter(PlatformUser.email == email)
            .first()
        )
