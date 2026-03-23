from datetime import datetime

from sqlalchemy.orm import Session

from app.apps.tenant_modules.core.models.user import User


class UserRepository:
    def get_by_id(self, tenant_db: Session, user_id: int) -> User | None:
        return (
            tenant_db.query(User)
            .filter(User.id == user_id)
            .first()
        )

    def get_by_email(self, tenant_db: Session, email: str) -> User | None:
        return (
            tenant_db.query(User)
            .filter(User.email == email)
            .first()
        )

    def list_all(self, tenant_db: Session) -> list[User]:
        return tenant_db.query(User).order_by(User.id.asc()).all()

    def count_all(self, tenant_db: Session) -> int:
        return tenant_db.query(User).count()

    def count_active(self, tenant_db: Session) -> int:
        return tenant_db.query(User).filter(User.is_active.is_(True)).count()

    def count_by_role(self, tenant_db: Session, role: str) -> int:
        return (
            tenant_db.query(User)
            .filter(User.role == role.strip().lower())
            .count()
        )

    def count_active_by_role(
        self,
        tenant_db: Session,
        role: str,
        *,
        exclude_user_id: int | None = None,
    ) -> int:
        query = tenant_db.query(User).filter(
            User.role == role.strip().lower(),
            User.is_active.is_(True),
        )
        if exclude_user_id is not None:
            query = query.filter(User.id != exclude_user_id)
        return query.count()

    def count_created_since(self, tenant_db: Session, created_since: datetime) -> int:
        return (
            tenant_db.query(User)
            .filter(User.created_at >= created_since)
            .count()
        )

    def save(self, tenant_db: Session, user: User) -> User:
        tenant_db.add(user)
        tenant_db.commit()
        tenant_db.refresh(user)
        return user
