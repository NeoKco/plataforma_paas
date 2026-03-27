from sqlalchemy.orm import Session

from app.apps.tenant_modules.finance.models import FinanceBeneficiary
from app.apps.tenant_modules.finance.repositories import FinanceBeneficiaryRepository
from app.apps.tenant_modules.finance.schemas import (
    FinanceBeneficiaryCreateRequest,
    FinanceBeneficiaryUpdateRequest,
)


class FinanceBeneficiaryService:
    def __init__(
        self,
        beneficiary_repository: FinanceBeneficiaryRepository | None = None,
    ) -> None:
        self.beneficiary_repository = beneficiary_repository or FinanceBeneficiaryRepository()

    def list_beneficiaries(
        self,
        tenant_db: Session,
        *,
        include_inactive: bool = True,
    ) -> list[FinanceBeneficiary]:
        return self.beneficiary_repository.list_all(
            tenant_db,
            include_inactive=include_inactive,
        )

    def create_beneficiary(
        self,
        tenant_db: Session,
        payload: FinanceBeneficiaryCreateRequest,
    ) -> FinanceBeneficiary:
        normalized = self._normalize_payload(payload)
        self._validate_payload(tenant_db, normalized)
        beneficiary = FinanceBeneficiary(**normalized)
        return self.beneficiary_repository.save(tenant_db, beneficiary)

    def get_beneficiary(self, tenant_db: Session, beneficiary_id: int) -> FinanceBeneficiary:
        return self._get_or_raise(tenant_db, beneficiary_id)

    def update_beneficiary(
        self,
        tenant_db: Session,
        beneficiary_id: int,
        payload: FinanceBeneficiaryUpdateRequest,
    ) -> FinanceBeneficiary:
        beneficiary = self._get_or_raise(tenant_db, beneficiary_id)
        normalized = self._normalize_payload(payload)
        self._validate_payload(tenant_db, normalized, current_item=beneficiary)
        for field, value in normalized.items():
            setattr(beneficiary, field, value)
        return self.beneficiary_repository.save(tenant_db, beneficiary)

    def set_beneficiary_active(
        self,
        tenant_db: Session,
        beneficiary_id: int,
        is_active: bool,
    ) -> FinanceBeneficiary:
        beneficiary = self._get_or_raise(tenant_db, beneficiary_id)
        return self.beneficiary_repository.set_active(tenant_db, beneficiary, is_active)

    def reorder_beneficiaries(
        self,
        tenant_db: Session,
        items: list[tuple[int, int]],
    ) -> list[FinanceBeneficiary]:
        return self.beneficiary_repository.reorder(tenant_db, items)

    def _get_or_raise(self, tenant_db: Session, beneficiary_id: int) -> FinanceBeneficiary:
        beneficiary = self.beneficiary_repository.get_by_id(tenant_db, beneficiary_id)
        if beneficiary is None:
            raise ValueError("El beneficiario solicitado no existe")
        return beneficiary

    def _normalize_payload(
        self,
        payload: FinanceBeneficiaryCreateRequest | FinanceBeneficiaryUpdateRequest,
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
        current_item: FinanceBeneficiary | None = None,
    ) -> None:
        if not payload["name"]:
            raise ValueError("El nombre del beneficiario es obligatorio")
        existing = self.beneficiary_repository.get_by_name(tenant_db, payload["name"])
        if existing and (current_item is None or existing.id != current_item.id):
            raise ValueError("Ya existe un beneficiario con ese nombre")
