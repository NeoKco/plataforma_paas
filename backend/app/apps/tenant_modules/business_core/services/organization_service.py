from sqlalchemy.orm import Session

from app.apps.tenant_modules.business_core.models import (
    BusinessClient,
    BusinessContact,
    BusinessOrganization,
)
from app.apps.tenant_modules.business_core.repositories import (
    BusinessOrganizationRepository,
)
from app.apps.tenant_modules.business_core.schemas import (
    BusinessOrganizationCreateRequest,
    BusinessOrganizationUpdateRequest,
)
from app.apps.tenant_modules.business_core.services.taxonomy_support import (
    strip_legacy_visible_text,
)


class BusinessOrganizationService:
    def __init__(
        self,
        organization_repository: BusinessOrganizationRepository | None = None,
    ) -> None:
        self.organization_repository = organization_repository or BusinessOrganizationRepository()

    def list_organizations(
        self,
        tenant_db: Session,
        *,
        organization_kind: str | None = None,
        include_inactive: bool = True,
        exclude_client_organizations: bool = False,
    ) -> list[BusinessOrganization]:
        if organization_kind:
            return self.organization_repository.list_by_kind(
                tenant_db,
                organization_kind,
                include_inactive=include_inactive,
            )
        return self.organization_repository.list_all(
            tenant_db,
            include_inactive=include_inactive,
            exclude_client_organizations=exclude_client_organizations,
        )

    def create_organization(
        self,
        tenant_db: Session,
        payload: BusinessOrganizationCreateRequest,
    ) -> BusinessOrganization:
        normalized = self._normalize_payload(payload)
        self._validate_payload(tenant_db, normalized)
        organization = BusinessOrganization(**normalized)
        return self.organization_repository.save(tenant_db, organization)

    def get_organization(
        self,
        tenant_db: Session,
        organization_id: int,
    ) -> BusinessOrganization:
        return self._get_organization_or_raise(tenant_db, organization_id)

    def update_organization(
        self,
        tenant_db: Session,
        organization_id: int,
        payload: BusinessOrganizationUpdateRequest,
    ) -> BusinessOrganization:
        organization = self._get_organization_or_raise(tenant_db, organization_id)
        normalized = self._normalize_payload(payload)
        self._validate_payload(tenant_db, normalized, current_organization=organization)

        for field, value in normalized.items():
            setattr(organization, field, value)

        return self.organization_repository.save(tenant_db, organization)

    def set_organization_active(
        self,
        tenant_db: Session,
        organization_id: int,
        is_active: bool,
    ) -> BusinessOrganization:
        organization = self._get_organization_or_raise(tenant_db, organization_id)
        return self.organization_repository.set_active(tenant_db, organization, is_active)

    def delete_organization(
        self,
        tenant_db: Session,
        organization_id: int,
    ) -> BusinessOrganization:
        organization = self._get_organization_or_raise(tenant_db, organization_id)

        client_exists = (
            tenant_db.query(BusinessClient.id)
            .filter(BusinessClient.organization_id == organization.id)
            .first()
        )
        if client_exists is not None:
            raise ValueError(
                "No puedes eliminar la organizacion porque ya esta asociada a clientes"
            )

        contact_exists = (
            tenant_db.query(BusinessContact.id)
            .filter(BusinessContact.organization_id == organization.id)
            .first()
        )
        if contact_exists is not None:
            raise ValueError(
                "No puedes eliminar la organizacion porque ya esta asociada a contactos"
            )

        self.organization_repository.delete(tenant_db, organization)
        return organization

    def _get_organization_or_raise(
        self,
        tenant_db: Session,
        organization_id: int,
    ) -> BusinessOrganization:
        organization = self.organization_repository.get_by_id(tenant_db, organization_id)
        if organization is None:
            raise ValueError("La organizacion solicitada no existe")
        return organization

    def _normalize_payload(
        self,
        payload: BusinessOrganizationCreateRequest | BusinessOrganizationUpdateRequest,
    ) -> dict:
        return {
            "name": payload.name.strip(),
            "legal_name": (
                payload.legal_name.strip() if payload.legal_name and payload.legal_name.strip() else None
            ),
            "tax_id": payload.tax_id.strip() if payload.tax_id and payload.tax_id.strip() else None,
            "organization_kind": payload.organization_kind.strip().lower(),
            "phone": payload.phone.strip() if payload.phone and payload.phone.strip() else None,
            "email": payload.email.strip() if payload.email and payload.email.strip() else None,
            "notes": strip_legacy_visible_text(payload.notes),
            "is_active": payload.is_active,
            "sort_order": payload.sort_order,
        }

    def _validate_payload(
        self,
        tenant_db: Session,
        payload: dict,
        *,
        current_organization: BusinessOrganization | None = None,
    ) -> None:
        if not payload["name"]:
            raise ValueError("El nombre de la organizacion es obligatorio")
        if not payload["organization_kind"]:
            raise ValueError("El tipo de organizacion es obligatorio")

        existing = self.organization_repository.get_by_name(tenant_db, payload["name"])
        if existing and (
            current_organization is None or existing.id != current_organization.id
        ):
            raise ValueError("Ya existe una organizacion con ese nombre")

        if payload["tax_id"]:
            existing_tax_id = self.organization_repository.get_by_tax_id(
                tenant_db,
                payload["tax_id"],
            )
            if existing_tax_id and (
                current_organization is None or existing_tax_id.id != current_organization.id
            ):
                raise ValueError("Ya existe una organizacion con ese identificador tributario")
