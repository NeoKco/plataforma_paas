from sqlalchemy import func
from typing import Generic, TypeVar

from sqlalchemy.orm import Session

ModelT = TypeVar("ModelT")


class BusinessCoreCatalogRepository(Generic[ModelT]):
    model_class: type[ModelT]
    name_field: str | None = "name"

    def list_all(
        self,
        tenant_db: Session,
        *,
        include_inactive: bool = True,
    ) -> list[ModelT]:
        query = tenant_db.query(self.model_class)
        if not include_inactive and hasattr(self.model_class, "is_active"):
            query = query.filter(getattr(self.model_class, "is_active").is_(True))

        if hasattr(self.model_class, "sort_order"):
            query = query.order_by(
                getattr(self.model_class, "sort_order").asc(),
                getattr(self.model_class, "id").asc(),
            )
        else:
            query = query.order_by(getattr(self.model_class, "id").asc())
        return query.all()

    def get_by_id(self, tenant_db: Session, item_id: int) -> ModelT | None:
        return (
            tenant_db.query(self.model_class)
            .filter(getattr(self.model_class, "id") == item_id)
            .first()
        )

    def get_by_name(self, tenant_db: Session, name: str) -> ModelT | None:
        if self.name_field is None:
            raise AttributeError("This repository does not support get_by_name")
        return (
            tenant_db.query(self.model_class)
            .filter(func.lower(getattr(self.model_class, self.name_field)) == name.strip().lower())
            .first()
        )

    def save(self, tenant_db: Session, item: ModelT) -> ModelT:
        tenant_db.add(item)
        try:
            tenant_db.commit()
        except Exception:
            tenant_db.rollback()
            raise
        tenant_db.refresh(item)
        return item

    def delete(self, tenant_db: Session, item: ModelT) -> None:
        tenant_db.delete(item)
        try:
            tenant_db.commit()
        except Exception:
            tenant_db.rollback()
            raise

    def set_active(self, tenant_db: Session, item: ModelT, is_active: bool) -> ModelT:
        setattr(item, "is_active", is_active)
        tenant_db.add(item)
        try:
            tenant_db.commit()
        except Exception:
            tenant_db.rollback()
            raise
        tenant_db.refresh(item)
        return item
