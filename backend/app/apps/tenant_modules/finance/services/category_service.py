from sqlalchemy.orm import Session

from app.apps.tenant_modules.finance.models import FinanceCategory
from app.apps.tenant_modules.finance.repositories import FinanceCategoryRepository
from app.apps.tenant_modules.finance.schemas import (
    FinanceCategoryCreateRequest,
    FinanceCategoryUpdateRequest,
)


class FinanceCategoryService:
    def __init__(
        self,
        category_repository: FinanceCategoryRepository | None = None,
    ) -> None:
        self.category_repository = category_repository or FinanceCategoryRepository()

    def list_categories(
        self,
        tenant_db: Session,
        *,
        category_type: str | None = None,
        include_inactive: bool = True,
    ) -> list[FinanceCategory]:
        if category_type:
            return self.category_repository.list_by_type(
                tenant_db,
                category_type,
                include_inactive=include_inactive,
            )
        return self.category_repository.list_all(
            tenant_db,
            include_inactive=include_inactive,
        )

    def create_category(
        self,
        tenant_db: Session,
        payload: FinanceCategoryCreateRequest,
    ) -> FinanceCategory:
        normalized = self._normalize_payload(payload)
        self._validate_payload(tenant_db, normalized)
        category = FinanceCategory(**normalized)
        return self.category_repository.save(tenant_db, category)

    def update_category(
        self,
        tenant_db: Session,
        category_id: int,
        payload: FinanceCategoryUpdateRequest,
    ) -> FinanceCategory:
        category = self._get_category_or_raise(tenant_db, category_id)
        normalized = self._normalize_payload(payload)
        self._validate_payload(tenant_db, normalized, current_category=category)

        for field, value in normalized.items():
            setattr(category, field, value)

        return self.category_repository.save(tenant_db, category)

    def set_category_active(
        self,
        tenant_db: Session,
        category_id: int,
        is_active: bool,
    ) -> FinanceCategory:
        category = self._get_category_or_raise(tenant_db, category_id)
        return self.category_repository.set_active(tenant_db, category, is_active)

    def _get_category_or_raise(self, tenant_db: Session, category_id: int) -> FinanceCategory:
        category = self.category_repository.get_by_id(tenant_db, category_id)
        if category is None:
            raise ValueError("La categoria financiera solicitada no existe")
        return category

    def _normalize_payload(
        self,
        payload: FinanceCategoryCreateRequest | FinanceCategoryUpdateRequest,
    ) -> dict:
        return {
            "name": payload.name.strip(),
            "category_type": payload.category_type.strip().lower(),
            "parent_category_id": payload.parent_category_id,
            "icon": payload.icon.strip() if payload.icon and payload.icon.strip() else None,
            "color": payload.color.strip() if payload.color and payload.color.strip() else None,
            "note": payload.note.strip() if payload.note and payload.note.strip() else None,
            "is_active": payload.is_active,
            "sort_order": payload.sort_order,
        }

    def _validate_payload(
        self,
        tenant_db: Session,
        payload: dict,
        *,
        current_category: FinanceCategory | None = None,
    ) -> None:
        if not payload["name"]:
            raise ValueError("El nombre de la categoria es obligatorio")
        if not payload["category_type"]:
            raise ValueError("El tipo de categoria es obligatorio")

        existing = self.category_repository.get_by_name_and_type(
            tenant_db,
            payload["name"],
            payload["category_type"],
        )
        if existing and (current_category is None or existing.id != current_category.id):
            raise ValueError("Ya existe una categoria con ese nombre para el tipo indicado")

        parent_category_id = payload["parent_category_id"]
        if parent_category_id is not None:
            parent_category = self.category_repository.get_by_id(tenant_db, parent_category_id)
            if parent_category is None:
                raise ValueError("La categoria padre seleccionada no existe")
            if parent_category.category_type != payload["category_type"]:
                raise ValueError("La categoria padre debe pertenecer al mismo tipo")
            if current_category and parent_category.id == current_category.id:
                raise ValueError("La categoria no puede ser su propia categoria padre")
