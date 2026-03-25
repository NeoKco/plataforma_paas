from sqlalchemy.orm import Session

from app.apps.platform_control.models.platform_user import PlatformUser


class PlatformUserRepository:
    def list_all(self, db: Session) -> list[PlatformUser]:
        return (
            db.query(PlatformUser)
            .order_by(PlatformUser.created_at.desc(), PlatformUser.id.desc())
            .all()
        )

    def get_by_id(self, db: Session, user_id: int) -> PlatformUser | None:
        return (
            db.query(PlatformUser)
            .filter(PlatformUser.id == user_id)
            .first()
        )

    def get_by_email(self, db: Session, email: str) -> PlatformUser | None:
        return (
            db.query(PlatformUser)
            .filter(PlatformUser.email == email)
            .first()
        )

    def count_active_by_role(self, db: Session, role: str) -> int:
        return (
            db.query(PlatformUser)
            .filter(
                PlatformUser.role == role,
                PlatformUser.is_active.is_(True),
            )
            .count()
        )

    def save(self, db: Session, user: PlatformUser) -> PlatformUser:
        db.add(user)
        db.commit()
        db.refresh(user)
        return user

    def delete(self, db: Session, user: PlatformUser) -> None:
        db.delete(user)
        db.commit()
