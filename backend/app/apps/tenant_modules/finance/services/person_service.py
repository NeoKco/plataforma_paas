from sqlalchemy.orm import Session

from app.apps.tenant_modules.finance.models import FinancePerson
from app.apps.tenant_modules.finance.repositories import FinancePersonRepository
from app.apps.tenant_modules.finance.schemas import (
    FinancePersonCreateRequest,
    FinancePersonUpdateRequest,
)


class FinancePersonService:
    def __init__(
        self,
        person_repository: FinancePersonRepository | None = None,
    ) -> None:
        self.person_repository = person_repository or FinancePersonRepository()

    def list_people(
        self,
        tenant_db: Session,
        *,
        include_inactive: bool = True,
    ) -> list[FinancePerson]:
        return self.person_repository.list_all(
            tenant_db,
            include_inactive=include_inactive,
        )

    def create_person(
        self,
        tenant_db: Session,
        payload: FinancePersonCreateRequest,
    ) -> FinancePerson:
        normalized = self._normalize_payload(payload)
        self._validate_payload(tenant_db, normalized)
        person = FinancePerson(**normalized)
        return self.person_repository.save(tenant_db, person)

    def get_person(self, tenant_db: Session, person_id: int) -> FinancePerson:
        return self._get_or_raise(tenant_db, person_id)

    def update_person(
        self,
        tenant_db: Session,
        person_id: int,
        payload: FinancePersonUpdateRequest,
    ) -> FinancePerson:
        person = self._get_or_raise(tenant_db, person_id)
        normalized = self._normalize_payload(payload)
        self._validate_payload(tenant_db, normalized, current_item=person)
        for field, value in normalized.items():
            setattr(person, field, value)
        return self.person_repository.save(tenant_db, person)

    def set_person_active(
        self,
        tenant_db: Session,
        person_id: int,
        is_active: bool,
    ) -> FinancePerson:
        person = self._get_or_raise(tenant_db, person_id)
        return self.person_repository.set_active(tenant_db, person, is_active)

    def reorder_people(
        self,
        tenant_db: Session,
        items: list[tuple[int, int]],
    ) -> list[FinancePerson]:
        return self.person_repository.reorder(tenant_db, items)

    def _get_or_raise(self, tenant_db: Session, person_id: int) -> FinancePerson:
        person = self.person_repository.get_by_id(tenant_db, person_id)
        if person is None:
            raise ValueError("La persona solicitada no existe")
        return person

    def _normalize_payload(
        self,
        payload: FinancePersonCreateRequest | FinancePersonUpdateRequest,
    ) -> dict:
        return {
            "name": payload.name.strip(),
            "icon": payload.icon.strip() if payload.icon and payload.icon.strip() else None,
            "note": payload.note.strip() if payload.note and payload.note.strip() else None,
            "is_active": payload.is_active,
            "sort_order": payload.sort_order,
        }

    def _validate_payload(
        self,
        tenant_db: Session,
        payload: dict,
        *,
        current_item: FinancePerson | None = None,
    ) -> None:
        if not payload["name"]:
            raise ValueError("El nombre de la persona es obligatorio")
        existing = self.person_repository.get_by_name(tenant_db, payload["name"])
        if existing and (current_item is None or existing.id != current_item.id):
            raise ValueError("Ya existe una persona con ese nombre")
