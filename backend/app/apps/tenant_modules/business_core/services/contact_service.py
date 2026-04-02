from sqlalchemy.orm import Session

from app.apps.tenant_modules.business_core.models import BusinessContact, BusinessOrganization
from app.apps.tenant_modules.business_core.repositories import (
    BusinessContactRepository,
    BusinessOrganizationRepository,
)
from app.apps.tenant_modules.business_core.schemas import (
    BusinessContactCreateRequest,
    BusinessContactUpdateRequest,
)


class BusinessContactService:
    def __init__(
        self,
        contact_repository: BusinessContactRepository | None = None,
        organization_repository: BusinessOrganizationRepository | None = None,
    ) -> None:
        self.contact_repository = contact_repository or BusinessContactRepository()
        self.organization_repository = (
            organization_repository or BusinessOrganizationRepository()
        )

    def list_contacts(
        self,
        tenant_db: Session,
        *,
        organization_id: int | None = None,
        include_inactive: bool = True,
    ) -> list[BusinessContact]:
        if organization_id is not None:
            return self.contact_repository.list_by_organization(
                tenant_db,
                organization_id,
                include_inactive=include_inactive,
            )
        return self.contact_repository.list_all(
            tenant_db,
            include_inactive=include_inactive,
        )

    def create_contact(
        self,
        tenant_db: Session,
        payload: BusinessContactCreateRequest,
    ) -> BusinessContact:
        normalized = self._normalize_payload(payload)
        self._validate_payload(tenant_db, normalized)
        contact = BusinessContact(**normalized)
        return self.contact_repository.save(tenant_db, contact)

    def get_contact(self, tenant_db: Session, contact_id: int) -> BusinessContact:
        return self._get_contact_or_raise(tenant_db, contact_id)

    def update_contact(
        self,
        tenant_db: Session,
        contact_id: int,
        payload: BusinessContactUpdateRequest,
    ) -> BusinessContact:
        contact = self._get_contact_or_raise(tenant_db, contact_id)
        normalized = self._normalize_payload(payload)
        self._validate_payload(tenant_db, normalized, current_contact=contact)

        for field, value in normalized.items():
            setattr(contact, field, value)

        return self.contact_repository.save(tenant_db, contact)

    def set_contact_active(
        self,
        tenant_db: Session,
        contact_id: int,
        is_active: bool,
    ) -> BusinessContact:
        contact = self._get_contact_or_raise(tenant_db, contact_id)
        return self.contact_repository.set_active(tenant_db, contact, is_active)

    def delete_contact(self, tenant_db: Session, contact_id: int) -> BusinessContact:
        contact = self._get_contact_or_raise(tenant_db, contact_id)
        self.contact_repository.delete(tenant_db, contact)
        return contact

    def _get_contact_or_raise(self, tenant_db: Session, contact_id: int) -> BusinessContact:
        contact = self.contact_repository.get_by_id(tenant_db, contact_id)
        if contact is None:
            raise ValueError("El contacto solicitado no existe")
        return contact

    def _normalize_payload(
        self,
        payload: BusinessContactCreateRequest | BusinessContactUpdateRequest,
    ) -> dict:
        return {
            "organization_id": payload.organization_id,
            "full_name": payload.full_name.strip(),
            "email": payload.email.strip() if payload.email and payload.email.strip() else None,
            "phone": payload.phone.strip() if payload.phone and payload.phone.strip() else None,
            "role_title": (
                payload.role_title.strip()
                if payload.role_title and payload.role_title.strip()
                else None
            ),
            "is_primary": payload.is_primary,
            "is_active": payload.is_active,
            "sort_order": payload.sort_order,
        }

    def _validate_payload(
        self,
        tenant_db: Session,
        payload: dict,
        *,
        current_contact: BusinessContact | None = None,
    ) -> None:
        if not payload["full_name"]:
            raise ValueError("El nombre del contacto es obligatorio")

        organization = self.organization_repository.get_by_id(
            tenant_db,
            payload["organization_id"],
        )
        if organization is None:
            raise ValueError("La organizacion seleccionada no existe")

        if (
            isinstance(organization, BusinessOrganization)
            and not organization.is_active
        ):
            raise ValueError("No puedes registrar contactos para una organizacion inactiva")

        if payload["is_primary"]:
            primary_contact = self.contact_repository.get_primary_by_organization(
                tenant_db,
                payload["organization_id"],
            )
            if primary_contact and (
                current_contact is None or primary_contact.id != current_contact.id
            ):
                raise ValueError(
                    "La organizacion seleccionada ya tiene un contacto principal"
                )
