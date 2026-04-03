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
from app.apps.tenant_modules.business_core.services.normalization_support import (
    normalize_email_key,
    normalize_human_key,
    normalize_phone_key,
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

        existing_contacts = self.contact_repository.list_by_organization(
            tenant_db,
            payload["organization_id"],
            include_inactive=True,
        )
        normalized_name = normalize_human_key(payload["full_name"])
        normalized_email = normalize_email_key(payload["email"])
        normalized_phone = normalize_phone_key(payload["phone"])

        for contact in existing_contacts:
            if current_contact is not None and contact.id == current_contact.id:
                continue
            if payload["is_primary"] and contact.is_primary:
                raise ValueError(
                    "La organizacion seleccionada ya tiene un contacto principal"
                )
            if normalize_human_key(contact.full_name) == normalized_name:
                raise ValueError("Ya existe un contacto con ese nombre en la organizacion")
            if normalized_email and normalize_email_key(contact.email) == normalized_email:
                raise ValueError("Ya existe un contacto con ese email en la organizacion")
            if normalized_phone and normalize_phone_key(contact.phone) == normalized_phone:
                raise ValueError("Ya existe un contacto con ese teléfono en la organizacion")
