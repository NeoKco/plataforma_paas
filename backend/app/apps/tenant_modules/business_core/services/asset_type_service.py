from sqlalchemy.orm import Session

from app.apps.tenant_modules.business_core.models import BusinessAssetType
from app.apps.tenant_modules.business_core.repositories import BusinessAssetTypeRepository
from app.apps.tenant_modules.business_core.schemas import (
    BusinessAssetTypeCreateRequest,
    BusinessAssetTypeUpdateRequest,
)
from app.apps.tenant_modules.business_core.services.taxonomy_support import (
    build_internal_taxonomy_code,
    strip_legacy_visible_text,
)


class BusinessAssetTypeService:
    def __init__(self, repository: BusinessAssetTypeRepository | None = None) -> None:
        self.repository = repository or BusinessAssetTypeRepository()

    def list_asset_types(self, tenant_db: Session, *, include_inactive: bool = True) -> list[BusinessAssetType]:
        return self.repository.list_all(tenant_db, include_inactive=include_inactive)

    def create_asset_type(self, tenant_db: Session, payload: BusinessAssetTypeCreateRequest) -> BusinessAssetType:
        normalized = self._normalize_payload(payload)
        self._validate_payload(tenant_db, normalized)
        item = BusinessAssetType(**normalized)
        return self.repository.save(tenant_db, item)

    def update_asset_type(self, tenant_db: Session, asset_type_id: int, payload: BusinessAssetTypeUpdateRequest) -> BusinessAssetType:
        item = self._get_or_raise(tenant_db, asset_type_id)
        normalized = self._normalize_payload(payload)
        self._validate_payload(tenant_db, normalized, current_item=item)
        for field, value in normalized.items():
            setattr(item, field, value)
        return self.repository.save(tenant_db, item)

    def set_asset_type_active(self, tenant_db: Session, asset_type_id: int, is_active: bool) -> BusinessAssetType:
        item = self._get_or_raise(tenant_db, asset_type_id)
        return self.repository.set_active(tenant_db, item, is_active)

    def delete_asset_type(self, tenant_db: Session, asset_type_id: int) -> BusinessAssetType:
        item = self._get_or_raise(tenant_db, asset_type_id)
        self.repository.delete(tenant_db, item)
        return item

    def _get_or_raise(self, tenant_db: Session, asset_type_id: int) -> BusinessAssetType:
        item = self.repository.get_by_id(tenant_db, asset_type_id)
        if item is None:
            raise ValueError("El tipo de activo solicitado no existe")
        return item

    def _normalize_payload(self, payload: BusinessAssetTypeCreateRequest | BusinessAssetTypeUpdateRequest) -> dict:
        return {
            "code": payload.code.strip().lower() if payload.code and payload.code.strip() else None,
            "name": payload.name.strip(),
            "description": strip_legacy_visible_text(payload.description),
            "is_active": payload.is_active,
            "sort_order": payload.sort_order,
        }

    def _validate_payload(self, tenant_db: Session, payload: dict, *, current_item: BusinessAssetType | None = None) -> None:
        if not payload["name"]:
            raise ValueError("El nombre del tipo de activo es obligatorio")

        if not payload["code"]:
            payload["code"] = build_internal_taxonomy_code("asset", payload["name"])

        existing_by_name = self.repository.get_by_name(tenant_db, payload["name"])
        if existing_by_name and (current_item is None or existing_by_name.id != current_item.id):
            raise ValueError("Ya existe un tipo de activo con ese nombre")

        if payload["code"]:
            existing_by_code = self.repository.get_by_code(tenant_db, payload["code"])
            if existing_by_code and (current_item is None or existing_by_code.id != current_item.id):
                raise ValueError("Ya existe un tipo de activo con ese codigo")
