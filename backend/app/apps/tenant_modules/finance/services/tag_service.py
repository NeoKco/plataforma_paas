from sqlalchemy.orm import Session

from app.apps.tenant_modules.finance.models import FinanceTag, FinanceTransactionTag
from app.apps.tenant_modules.finance.repositories import (
    FinanceTagRepository,
)
from app.apps.tenant_modules.finance.schemas import (
    FinanceTagCreateRequest,
    FinanceTagUpdateRequest,
)


class FinanceTagService:
    def __init__(
        self,
        tag_repository: FinanceTagRepository | None = None,
    ) -> None:
        self.tag_repository = tag_repository or FinanceTagRepository()

    def list_tags(
        self,
        tenant_db: Session,
        *,
        include_inactive: bool = True,
    ) -> list[FinanceTag]:
        return self.tag_repository.list_all(
            tenant_db,
            include_inactive=include_inactive,
        )

    def create_tag(
        self,
        tenant_db: Session,
        payload: FinanceTagCreateRequest,
    ) -> FinanceTag:
        normalized = self._normalize_payload(payload)
        self._validate_payload(tenant_db, normalized)
        tag = FinanceTag(**normalized)
        return self.tag_repository.save(tenant_db, tag)

    def get_tag(self, tenant_db: Session, tag_id: int) -> FinanceTag:
        return self._get_or_raise(tenant_db, tag_id)

    def update_tag(
        self,
        tenant_db: Session,
        tag_id: int,
        payload: FinanceTagUpdateRequest,
    ) -> FinanceTag:
        tag = self._get_or_raise(tenant_db, tag_id)
        normalized = self._normalize_payload(payload)
        self._validate_payload(tenant_db, normalized, current_item=tag)
        for field, value in normalized.items():
            setattr(tag, field, value)
        return self.tag_repository.save(tenant_db, tag)

    def set_tag_active(
        self,
        tenant_db: Session,
        tag_id: int,
        is_active: bool,
    ) -> FinanceTag:
        tag = self._get_or_raise(tenant_db, tag_id)
        return self.tag_repository.set_active(tenant_db, tag, is_active)

    def reorder_tags(
        self,
        tenant_db: Session,
        items: list[tuple[int, int]],
    ) -> list[FinanceTag]:
        return self.tag_repository.reorder(tenant_db, items)

    def delete_tag(self, tenant_db: Session, tag_id: int) -> FinanceTag:
        tag = self._get_or_raise(tenant_db, tag_id)
        usage_exists = (
            tenant_db.query(FinanceTransactionTag.transaction_id)
            .filter(FinanceTransactionTag.tag_id == tag.id)
            .first()
        )
        if usage_exists is not None:
            raise ValueError(
                "No puedes eliminar la etiqueta porque ya esta asociada a transacciones"
            )
        self.tag_repository.delete(tenant_db, tag)
        return tag

    def _get_or_raise(self, tenant_db: Session, tag_id: int) -> FinanceTag:
        tag = self.tag_repository.get_by_id(tenant_db, tag_id)
        if tag is None:
            raise ValueError("La etiqueta solicitada no existe")
        return tag

    def _normalize_payload(
        self,
        payload: FinanceTagCreateRequest | FinanceTagUpdateRequest,
    ) -> dict:
        return {
            "name": payload.name.strip(),
            "color": payload.color.strip() if payload.color and payload.color.strip() else None,
            "is_active": payload.is_active,
            "sort_order": payload.sort_order,
        }

    def _validate_payload(
        self,
        tenant_db: Session,
        payload: dict,
        *,
        current_item: FinanceTag | None = None,
    ) -> None:
        if not payload["name"]:
            raise ValueError("El nombre de la etiqueta es obligatorio")
        existing = self.tag_repository.get_by_name(tenant_db, payload["name"])
        if existing and (current_item is None or existing.id != current_item.id):
            raise ValueError("Ya existe una etiqueta con ese nombre")
