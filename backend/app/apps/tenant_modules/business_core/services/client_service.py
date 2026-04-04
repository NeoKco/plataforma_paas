from sqlalchemy.orm import Session

from app.apps.tenant_modules.business_core.models import (
    BusinessClient,
    BusinessOrganization,
    BusinessSite,
)
from app.apps.tenant_modules.maintenance.models import MaintenanceWorkOrder
from app.apps.tenant_modules.business_core.repositories import (
    BusinessClientRepository,
    BusinessOrganizationRepository,
)
from app.apps.tenant_modules.business_core.schemas import (
    BusinessClientCreateRequest,
    BusinessClientUpdateRequest,
)
from app.apps.tenant_modules.business_core.services.taxonomy_support import (
    build_internal_taxonomy_code,
    strip_legacy_visible_text,
)


class BusinessClientService:
    def __init__(
        self,
        client_repository: BusinessClientRepository | None = None,
        organization_repository: BusinessOrganizationRepository | None = None,
    ) -> None:
        self.client_repository = client_repository or BusinessClientRepository()
        self.organization_repository = (
            organization_repository or BusinessOrganizationRepository()
        )

    def list_clients(
        self,
        tenant_db: Session,
        *,
        organization_id: int | None = None,
        include_inactive: bool = True,
    ) -> list[BusinessClient]:
        if organization_id is not None:
            return self.client_repository.list_by_organization(
                tenant_db,
                organization_id,
                include_inactive=include_inactive,
            )
        return self.client_repository.list_all(
            tenant_db,
            include_inactive=include_inactive,
        )

    def create_client(
        self,
        tenant_db: Session,
        payload: BusinessClientCreateRequest,
    ) -> BusinessClient:
        normalized = self._normalize_payload(payload)
        organization = self._validate_payload(tenant_db, normalized)
        normalized["client_code"] = self._resolve_internal_client_code(
            tenant_db,
            organization=organization,
        )
        client = BusinessClient(**normalized)
        return self.client_repository.save(tenant_db, client)

    def get_client(self, tenant_db: Session, client_id: int) -> BusinessClient:
        return self._get_client_or_raise(tenant_db, client_id)

    def update_client(
        self,
        tenant_db: Session,
        client_id: int,
        payload: BusinessClientUpdateRequest,
    ) -> BusinessClient:
        client = self._get_client_or_raise(tenant_db, client_id)
        normalized = self._normalize_payload(payload)
        organization = self._validate_payload(
            tenant_db,
            normalized,
            current_client=client,
        )
        normalized["client_code"] = self._resolve_internal_client_code(
            tenant_db,
            organization=organization,
            current_client=client,
        )

        for field, value in normalized.items():
            setattr(client, field, value)

        return self.client_repository.save(tenant_db, client)

    def set_client_active(
        self,
        tenant_db: Session,
        client_id: int,
        is_active: bool,
    ) -> BusinessClient:
        client = self._get_client_or_raise(tenant_db, client_id)
        return self.client_repository.set_active(tenant_db, client, is_active)

    def delete_client(self, tenant_db: Session, client_id: int) -> BusinessClient:
        client = self._get_client_or_raise(tenant_db, client_id)

        work_order_exists = (
            tenant_db.query(MaintenanceWorkOrder.id)
            .filter(MaintenanceWorkOrder.client_id == client.id)
            .first()
        )
        if work_order_exists is not None:
            raise ValueError(
                "No puedes eliminar el cliente porque ya tiene mantenciones registradas. Debes desactivarlo."
            )

        site_exists = (
            tenant_db.query(BusinessSite.id)
            .filter(BusinessSite.client_id == client.id)
            .first()
        )
        if site_exists is not None:
            raise ValueError(
                "No puedes eliminar el cliente porque ya esta asociado a sitios"
            )

        self.client_repository.delete(tenant_db, client)
        return client

    def _get_client_or_raise(self, tenant_db: Session, client_id: int) -> BusinessClient:
        client = self.client_repository.get_by_id(tenant_db, client_id)
        if client is None:
            raise ValueError("El cliente solicitado no existe")
        return client

    def _normalize_payload(
        self,
        payload: BusinessClientCreateRequest | BusinessClientUpdateRequest,
    ) -> dict:
        return {
            "organization_id": payload.organization_id,
            "service_status": payload.service_status.strip().lower(),
            "commercial_notes": (
                strip_legacy_visible_text(payload.commercial_notes)
            ),
            "is_active": payload.is_active,
            "sort_order": payload.sort_order,
        }

    def _validate_payload(
        self,
        tenant_db: Session,
        payload: dict,
        *,
        current_client: BusinessClient | None = None,
    ) -> BusinessOrganization:
        organization = self.organization_repository.get_by_id(
            tenant_db,
            payload["organization_id"],
        )
        if organization is None:
            raise ValueError("La organizacion seleccionada no existe")

        existing_client = self.client_repository.get_by_organization_id(
            tenant_db,
            payload["organization_id"],
        )
        if existing_client and (current_client is None or existing_client.id != current_client.id):
            raise ValueError("La organizacion seleccionada ya tiene un cliente asociado")

        if not payload["service_status"]:
            raise ValueError("El estado de servicio del cliente es obligatorio")

        if (
            isinstance(organization, BusinessOrganization)
            and organization.organization_kind.strip().lower() == "internal"
        ):
            raise ValueError("La organizacion interna no puede registrarse como cliente")

        return organization

    def _resolve_internal_client_code(
        self,
        tenant_db: Session,
        *,
        organization: BusinessOrganization,
        current_client: BusinessClient | None = None,
    ) -> str:
        if current_client is not None and current_client.client_code:
            return current_client.client_code

        seed = (
            organization.tax_id
            or organization.legal_name
            or organization.name
            or f"client-{organization.id}"
        )
        base_code = build_internal_taxonomy_code(
            "cli",
            seed,
            fallback=f"org-{organization.id}",
        ).upper()
        candidate = base_code
        suffix = 2

        while True:
            existing = self.client_repository.get_by_client_code(tenant_db, candidate)
            if existing is None or (current_client is not None and existing.id == current_client.id):
                return candidate
            candidate = f"{base_code}-{suffix}"
            suffix += 1
