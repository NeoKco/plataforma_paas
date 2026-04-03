from sqlalchemy.orm import Session

from app.apps.tenant_modules.business_core.models import BusinessFunctionProfile
from app.apps.tenant_modules.business_core.repositories import (
    BusinessFunctionProfileRepository,
)
from app.apps.tenant_modules.business_core.schemas import (
    BusinessFunctionProfileCreateRequest,
    BusinessFunctionProfileUpdateRequest,
)
from app.apps.tenant_modules.business_core.services.taxonomy_support import (
    build_internal_taxonomy_code,
    strip_legacy_visible_text,
)


class BusinessFunctionProfileService:
    def __init__(
        self,
        function_profile_repository: BusinessFunctionProfileRepository | None = None,
    ) -> None:
        self.function_profile_repository = (
            function_profile_repository or BusinessFunctionProfileRepository()
        )

    def list_function_profiles(
        self,
        tenant_db: Session,
        *,
        include_inactive: bool = True,
    ) -> list[BusinessFunctionProfile]:
        return self.function_profile_repository.list_all(
            tenant_db,
            include_inactive=include_inactive,
        )

    def create_function_profile(
        self,
        tenant_db: Session,
        payload: BusinessFunctionProfileCreateRequest,
    ) -> BusinessFunctionProfile:
        normalized = self._normalize_payload(payload)
        self._validate_payload(tenant_db, normalized)
        item = BusinessFunctionProfile(**normalized)
        return self.function_profile_repository.save(tenant_db, item)

    def get_function_profile(
        self,
        tenant_db: Session,
        function_profile_id: int,
    ) -> BusinessFunctionProfile:
        return self._get_or_raise(tenant_db, function_profile_id)

    def update_function_profile(
        self,
        tenant_db: Session,
        function_profile_id: int,
        payload: BusinessFunctionProfileUpdateRequest,
    ) -> BusinessFunctionProfile:
        item = self._get_or_raise(tenant_db, function_profile_id)
        normalized = self._normalize_payload(payload)
        self._validate_payload(tenant_db, normalized, current_item=item)
        for field, value in normalized.items():
            setattr(item, field, value)
        return self.function_profile_repository.save(tenant_db, item)

    def set_function_profile_active(
        self,
        tenant_db: Session,
        function_profile_id: int,
        is_active: bool,
    ) -> BusinessFunctionProfile:
        item = self._get_or_raise(tenant_db, function_profile_id)
        return self.function_profile_repository.set_active(tenant_db, item, is_active)

    def delete_function_profile(
        self,
        tenant_db: Session,
        function_profile_id: int,
    ) -> BusinessFunctionProfile:
        item = self._get_or_raise(tenant_db, function_profile_id)
        self.function_profile_repository.delete(tenant_db, item)
        return item

    def _get_or_raise(
        self,
        tenant_db: Session,
        function_profile_id: int,
    ) -> BusinessFunctionProfile:
        item = self.function_profile_repository.get_by_id(tenant_db, function_profile_id)
        if item is None:
            raise ValueError("El perfil funcional solicitado no existe")
        return item

    def _normalize_payload(
        self,
        payload: BusinessFunctionProfileCreateRequest | BusinessFunctionProfileUpdateRequest,
    ) -> dict:
        return {
            "code": (
                payload.code.strip().lower()
                if payload.code and payload.code.strip()
                else build_internal_taxonomy_code("profile", payload.name)
            ),
            "name": payload.name.strip(),
            "description": strip_legacy_visible_text(payload.description),
            "is_active": payload.is_active,
            "sort_order": payload.sort_order,
        }

    def _validate_payload(
        self,
        tenant_db: Session,
        payload: dict,
        *,
        current_item: BusinessFunctionProfile | None = None,
    ) -> None:
        if not payload["name"]:
            raise ValueError("El nombre del perfil funcional es obligatorio")

        existing_by_code = self.function_profile_repository.get_by_code(
            tenant_db,
            payload["code"],
        )
        if existing_by_code and (
            current_item is None or existing_by_code.id != current_item.id
        ):
            raise ValueError("Ya existe un perfil funcional con ese codigo")

        existing_by_name = self.function_profile_repository.get_by_name(
            tenant_db,
            payload["name"],
        )
        if existing_by_name and (
            current_item is None or existing_by_name.id != current_item.id
        ):
            raise ValueError("Ya existe un perfil funcional con ese nombre")
