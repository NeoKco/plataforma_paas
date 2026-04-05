from sqlalchemy.orm import Session

from app.apps.tenant_modules.business_core.models import BusinessAsset, BusinessAssetType, BusinessSite
from app.apps.tenant_modules.business_core.repositories import (
    BusinessAssetRepository,
    BusinessAssetTypeRepository,
    BusinessSiteRepository,
)
from app.apps.tenant_modules.business_core.schemas import BusinessAssetCreateRequest, BusinessAssetUpdateRequest
from app.apps.tenant_modules.business_core.services.taxonomy_support import (
    build_internal_taxonomy_code,
    strip_legacy_visible_text,
)


class BusinessAssetService:
    def __init__(
        self,
        repository: BusinessAssetRepository | None = None,
        site_repository: BusinessSiteRepository | None = None,
        asset_type_repository: BusinessAssetTypeRepository | None = None,
    ) -> None:
        self.repository = repository or BusinessAssetRepository()
        self.site_repository = site_repository or BusinessSiteRepository()
        self.asset_type_repository = asset_type_repository or BusinessAssetTypeRepository()

    def list_assets(self, tenant_db: Session, *, site_id: int | None = None, include_inactive: bool = True) -> list[BusinessAsset]:
        if site_id is not None:
            return self.repository.list_by_site(tenant_db, site_id, include_inactive=include_inactive)
        return self.repository.list_all(tenant_db, include_inactive=include_inactive)

    def create_asset(self, tenant_db: Session, payload: BusinessAssetCreateRequest) -> BusinessAsset:
        normalized = self._normalize_payload(payload)
        self._validate_payload(tenant_db, normalized)
        if not normalized["asset_code"]:
            normalized["asset_code"] = build_internal_taxonomy_code("asset", normalized["name"])
        item = BusinessAsset(**normalized)
        return self.repository.save(tenant_db, item)

    def update_asset(self, tenant_db: Session, asset_id: int, payload: BusinessAssetUpdateRequest) -> BusinessAsset:
        item = self._get_or_raise(tenant_db, asset_id)
        normalized = self._normalize_payload(payload)
        self._validate_payload(tenant_db, normalized, current_item=item)
        if not normalized["asset_code"]:
            normalized["asset_code"] = item.asset_code or build_internal_taxonomy_code("asset", normalized["name"], asset_id)
        for field, value in normalized.items():
            setattr(item, field, value)
        return self.repository.save(tenant_db, item)

    def set_asset_active(self, tenant_db: Session, asset_id: int, is_active: bool) -> BusinessAsset:
        item = self._get_or_raise(tenant_db, asset_id)
        return self.repository.set_active(tenant_db, item, is_active)

    def delete_asset(self, tenant_db: Session, asset_id: int) -> BusinessAsset:
        item = self._get_or_raise(tenant_db, asset_id)
        self.repository.delete(tenant_db, item)
        return item

    def _get_or_raise(self, tenant_db: Session, asset_id: int) -> BusinessAsset:
        item = self.repository.get_by_id(tenant_db, asset_id)
        if item is None:
            raise ValueError("El activo solicitado no existe")
        return item

    def _normalize_payload(self, payload: BusinessAssetCreateRequest | BusinessAssetUpdateRequest) -> dict:
        return {
            "site_id": payload.site_id,
            "asset_type_id": payload.asset_type_id,
            "name": payload.name.strip(),
            "asset_code": payload.asset_code.strip().lower() if payload.asset_code and payload.asset_code.strip() else None,
            "serial_number": payload.serial_number.strip() if payload.serial_number and payload.serial_number.strip() else None,
            "manufacturer": payload.manufacturer.strip() if payload.manufacturer and payload.manufacturer.strip() else None,
            "model": payload.model.strip() if payload.model and payload.model.strip() else None,
            "asset_status": payload.asset_status.strip().lower(),
            "installed_at": payload.installed_at,
            "last_service_at": payload.last_service_at,
            "warranty_until": payload.warranty_until,
            "location_note": strip_legacy_visible_text(payload.location_note),
            "technical_notes": strip_legacy_visible_text(payload.technical_notes),
            "is_active": payload.is_active,
            "sort_order": payload.sort_order,
        }

    def _validate_payload(self, tenant_db: Session, payload: dict, *, current_item: BusinessAsset | None = None) -> None:
        if not payload["name"]:
            raise ValueError("El nombre del activo es obligatorio")

        site = self.site_repository.get_by_id(tenant_db, payload["site_id"])
        if site is None:
            raise ValueError("El sitio seleccionado no existe")

        asset_type = self.asset_type_repository.get_by_id(tenant_db, payload["asset_type_id"])
        if asset_type is None:
            raise ValueError("El tipo de activo seleccionado no existe")

        existing_assets = self.repository.list_by_site(tenant_db, payload["site_id"], include_inactive=True)
        for item in existing_assets:
            if current_item is not None and item.id == current_item.id:
                continue
            if item.name.strip().lower() == payload["name"].strip().lower():
                raise ValueError("Ya existe un activo con ese nombre en el sitio")
            if payload["asset_code"] and item.asset_code and item.asset_code.strip().lower() == payload["asset_code"].strip().lower():
                raise ValueError("Ya existe un activo con ese codigo")
            if payload["serial_number"] and item.serial_number and item.serial_number.strip().lower() == payload["serial_number"].strip().lower():
                raise ValueError("Ya existe un activo con ese numero de serie en el sitio")
