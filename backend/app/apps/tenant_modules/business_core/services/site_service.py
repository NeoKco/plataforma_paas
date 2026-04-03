from sqlalchemy.orm import Session

from app.apps.tenant_modules.business_core.models import BusinessClient, BusinessSite
from app.apps.tenant_modules.business_core.repositories import (
    BusinessClientRepository,
    BusinessSiteRepository,
)
from app.apps.tenant_modules.business_core.schemas import (
    BusinessSiteCreateRequest,
    BusinessSiteUpdateRequest,
)


class BusinessSiteService:
    def __init__(
        self,
        site_repository: BusinessSiteRepository | None = None,
        client_repository: BusinessClientRepository | None = None,
    ) -> None:
        self.site_repository = site_repository or BusinessSiteRepository()
        self.client_repository = client_repository or BusinessClientRepository()

    def list_sites(
        self,
        tenant_db: Session,
        *,
        client_id: int | None = None,
        include_inactive: bool = True,
    ) -> list[BusinessSite]:
        if client_id is not None:
            return self.site_repository.list_by_client(
                tenant_db,
                client_id,
                include_inactive=include_inactive,
            )
        return self.site_repository.list_all(
            tenant_db,
            include_inactive=include_inactive,
        )

    def create_site(
        self,
        tenant_db: Session,
        payload: BusinessSiteCreateRequest,
    ) -> BusinessSite:
        normalized = self._normalize_payload(payload)
        # `site_code` queda reservado para integraciones/importadores, no para captura manual.
        normalized["site_code"] = None
        self._validate_payload(tenant_db, normalized)
        site = BusinessSite(**normalized)
        return self.site_repository.save(tenant_db, site)

    def get_site(self, tenant_db: Session, site_id: int) -> BusinessSite:
        return self._get_site_or_raise(tenant_db, site_id)

    def update_site(
        self,
        tenant_db: Session,
        site_id: int,
        payload: BusinessSiteUpdateRequest,
    ) -> BusinessSite:
        site = self._get_site_or_raise(tenant_db, site_id)
        normalized = self._normalize_payload(payload)
        normalized["site_code"] = site.site_code
        self._validate_payload(tenant_db, normalized, current_site=site)

        for field, value in normalized.items():
            setattr(site, field, value)

        return self.site_repository.save(tenant_db, site)

    def set_site_active(
        self,
        tenant_db: Session,
        site_id: int,
        is_active: bool,
    ) -> BusinessSite:
        site = self._get_site_or_raise(tenant_db, site_id)
        return self.site_repository.set_active(tenant_db, site, is_active)

    def delete_site(self, tenant_db: Session, site_id: int) -> BusinessSite:
        site = self._get_site_or_raise(tenant_db, site_id)
        self.site_repository.delete(tenant_db, site)
        return site

    def _get_site_or_raise(self, tenant_db: Session, site_id: int) -> BusinessSite:
        site = self.site_repository.get_by_id(tenant_db, site_id)
        if site is None:
            raise ValueError("El sitio solicitado no existe")
        return site

    def _normalize_payload(
        self,
        payload: BusinessSiteCreateRequest | BusinessSiteUpdateRequest,
    ) -> dict:
        return {
            "client_id": payload.client_id,
            "name": payload.name.strip(),
            "site_code": (
                payload.site_code.strip().upper()
                if payload.site_code and payload.site_code.strip()
                else None
            ),
            "address_line": (
                payload.address_line.strip()
                if payload.address_line and payload.address_line.strip()
                else None
            ),
            "commune": (
                payload.commune.strip() if payload.commune and payload.commune.strip() else None
            ),
            "city": payload.city.strip() if payload.city and payload.city.strip() else None,
            "region": payload.region.strip() if payload.region and payload.region.strip() else None,
            "country_code": (
                payload.country_code.strip().upper()
                if payload.country_code and payload.country_code.strip()
                else "CL"
            ),
            "reference_notes": (
                payload.reference_notes.strip()
                if payload.reference_notes and payload.reference_notes.strip()
                else None
            ),
            "is_active": payload.is_active,
            "sort_order": payload.sort_order,
        }

    def _validate_payload(
        self,
        tenant_db: Session,
        payload: dict,
        *,
        current_site: BusinessSite | None = None,
    ) -> None:
        if not payload["name"]:
            raise ValueError("El nombre del sitio es obligatorio")

        client = self.client_repository.get_by_id(tenant_db, payload["client_id"])
        if client is None:
            raise ValueError("El cliente seleccionado no existe")

        if isinstance(client, BusinessClient) and not client.is_active:
            raise ValueError("No puedes registrar sitios para un cliente inactivo")

        if payload["site_code"]:
            existing_code = self.site_repository.get_by_site_code(
                tenant_db,
                payload["site_code"],
            )
            if existing_code and (
                current_site is None or existing_code.id != current_site.id
            ):
                raise ValueError("Ya existe un sitio con ese codigo")
