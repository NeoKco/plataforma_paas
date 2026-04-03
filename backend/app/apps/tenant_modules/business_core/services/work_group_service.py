from sqlalchemy.orm import Session

from app.apps.tenant_modules.business_core.models import BusinessWorkGroup
from app.apps.tenant_modules.business_core.repositories import (
    BusinessWorkGroupRepository,
)
from app.apps.tenant_modules.business_core.schemas import (
    BusinessWorkGroupCreateRequest,
    BusinessWorkGroupUpdateRequest,
)
from app.apps.tenant_modules.business_core.services.taxonomy_support import (
    build_internal_taxonomy_code,
    strip_legacy_visible_text,
)


class BusinessWorkGroupService:
    def __init__(
        self,
        work_group_repository: BusinessWorkGroupRepository | None = None,
    ) -> None:
        self.work_group_repository = work_group_repository or BusinessWorkGroupRepository()

    def list_work_groups(
        self,
        tenant_db: Session,
        *,
        include_inactive: bool = True,
        group_kind: str | None = None,
    ) -> list[BusinessWorkGroup]:
        items = self.work_group_repository.list_all(
            tenant_db,
            include_inactive=include_inactive,
        )
        if group_kind:
            return [item for item in items if item.group_kind == group_kind.strip().lower()]
        return items

    def create_work_group(
        self,
        tenant_db: Session,
        payload: BusinessWorkGroupCreateRequest,
    ) -> BusinessWorkGroup:
        normalized = self._normalize_payload(payload)
        self._validate_payload(tenant_db, normalized)
        item = BusinessWorkGroup(**normalized)
        return self.work_group_repository.save(tenant_db, item)

    def get_work_group(
        self,
        tenant_db: Session,
        work_group_id: int,
    ) -> BusinessWorkGroup:
        return self._get_or_raise(tenant_db, work_group_id)

    def update_work_group(
        self,
        tenant_db: Session,
        work_group_id: int,
        payload: BusinessWorkGroupUpdateRequest,
    ) -> BusinessWorkGroup:
        item = self._get_or_raise(tenant_db, work_group_id)
        normalized = self._normalize_payload(payload)
        self._validate_payload(tenant_db, normalized, current_item=item)
        for field, value in normalized.items():
            setattr(item, field, value)
        return self.work_group_repository.save(tenant_db, item)

    def set_work_group_active(
        self,
        tenant_db: Session,
        work_group_id: int,
        is_active: bool,
    ) -> BusinessWorkGroup:
        item = self._get_or_raise(tenant_db, work_group_id)
        return self.work_group_repository.set_active(tenant_db, item, is_active)

    def delete_work_group(
        self,
        tenant_db: Session,
        work_group_id: int,
    ) -> BusinessWorkGroup:
        item = self._get_or_raise(tenant_db, work_group_id)
        self.work_group_repository.delete(tenant_db, item)
        return item

    def _get_or_raise(
        self,
        tenant_db: Session,
        work_group_id: int,
    ) -> BusinessWorkGroup:
        item = self.work_group_repository.get_by_id(tenant_db, work_group_id)
        if item is None:
            raise ValueError("El grupo de trabajo solicitado no existe")
        return item

    def _normalize_payload(
        self,
        payload: BusinessWorkGroupCreateRequest | BusinessWorkGroupUpdateRequest,
    ) -> dict:
        return {
            "code": (
                payload.code.strip().lower()
                if payload.code and payload.code.strip()
                else build_internal_taxonomy_code("group", payload.name)
            ),
            "name": payload.name.strip(),
            "description": strip_legacy_visible_text(payload.description),
            "group_kind": payload.group_kind.strip().lower(),
            "is_active": payload.is_active,
            "sort_order": payload.sort_order,
        }

    def _validate_payload(
        self,
        tenant_db: Session,
        payload: dict,
        *,
        current_item: BusinessWorkGroup | None = None,
    ) -> None:
        if not payload["name"]:
            raise ValueError("El nombre del grupo de trabajo es obligatorio")
        if not payload["group_kind"]:
            raise ValueError("El tipo de grupo es obligatorio")

        existing_by_code = self.work_group_repository.get_by_code(
            tenant_db,
            payload["code"],
        )
        if existing_by_code and (
            current_item is None or existing_by_code.id != current_item.id
        ):
            raise ValueError("Ya existe un grupo de trabajo con ese codigo")

        existing_by_name = self.work_group_repository.get_by_name(
            tenant_db,
            payload["name"],
        )
        if existing_by_name and (
            current_item is None or existing_by_name.id != current_item.id
        ):
            raise ValueError("Ya existe un grupo de trabajo con ese nombre")
