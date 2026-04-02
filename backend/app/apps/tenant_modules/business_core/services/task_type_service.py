from sqlalchemy.orm import Session

from app.apps.tenant_modules.business_core.models import BusinessTaskType
from app.apps.tenant_modules.business_core.repositories import (
    BusinessTaskTypeRepository,
)
from app.apps.tenant_modules.business_core.schemas import (
    BusinessTaskTypeCreateRequest,
    BusinessTaskTypeUpdateRequest,
)


class BusinessTaskTypeService:
    def __init__(
        self,
        task_type_repository: BusinessTaskTypeRepository | None = None,
    ) -> None:
        self.task_type_repository = task_type_repository or BusinessTaskTypeRepository()

    def list_task_types(
        self,
        tenant_db: Session,
        *,
        include_inactive: bool = True,
    ) -> list[BusinessTaskType]:
        return self.task_type_repository.list_all(
            tenant_db,
            include_inactive=include_inactive,
        )

    def create_task_type(
        self,
        tenant_db: Session,
        payload: BusinessTaskTypeCreateRequest,
    ) -> BusinessTaskType:
        normalized = self._normalize_payload(payload)
        self._validate_payload(tenant_db, normalized)
        item = BusinessTaskType(**normalized)
        return self.task_type_repository.save(tenant_db, item)

    def get_task_type(
        self,
        tenant_db: Session,
        task_type_id: int,
    ) -> BusinessTaskType:
        return self._get_or_raise(tenant_db, task_type_id)

    def update_task_type(
        self,
        tenant_db: Session,
        task_type_id: int,
        payload: BusinessTaskTypeUpdateRequest,
    ) -> BusinessTaskType:
        item = self._get_or_raise(tenant_db, task_type_id)
        normalized = self._normalize_payload(payload)
        self._validate_payload(tenant_db, normalized, current_item=item)
        for field, value in normalized.items():
            setattr(item, field, value)
        return self.task_type_repository.save(tenant_db, item)

    def set_task_type_active(
        self,
        tenant_db: Session,
        task_type_id: int,
        is_active: bool,
    ) -> BusinessTaskType:
        item = self._get_or_raise(tenant_db, task_type_id)
        return self.task_type_repository.set_active(tenant_db, item, is_active)

    def delete_task_type(
        self,
        tenant_db: Session,
        task_type_id: int,
    ) -> BusinessTaskType:
        item = self._get_or_raise(tenant_db, task_type_id)
        self.task_type_repository.delete(tenant_db, item)
        return item

    def _get_or_raise(
        self,
        tenant_db: Session,
        task_type_id: int,
    ) -> BusinessTaskType:
        item = self.task_type_repository.get_by_id(tenant_db, task_type_id)
        if item is None:
            raise ValueError("El tipo de tarea solicitado no existe")
        return item

    def _normalize_payload(
        self,
        payload: BusinessTaskTypeCreateRequest | BusinessTaskTypeUpdateRequest,
    ) -> dict:
        return {
            "code": payload.code.strip().lower(),
            "name": payload.name.strip(),
            "description": payload.description.strip() if payload.description and payload.description.strip() else None,
            "color": payload.color.strip() if payload.color and payload.color.strip() else None,
            "icon": payload.icon.strip() if payload.icon and payload.icon.strip() else None,
            "is_active": payload.is_active,
            "sort_order": payload.sort_order,
        }

    def _validate_payload(
        self,
        tenant_db: Session,
        payload: dict,
        *,
        current_item: BusinessTaskType | None = None,
    ) -> None:
        if not payload["code"]:
            raise ValueError("El codigo del tipo de tarea es obligatorio")
        if not payload["name"]:
            raise ValueError("El nombre del tipo de tarea es obligatorio")

        existing_by_code = self.task_type_repository.get_by_code(
            tenant_db,
            payload["code"],
        )
        if existing_by_code and (
            current_item is None or existing_by_code.id != current_item.id
        ):
            raise ValueError("Ya existe un tipo de tarea con ese codigo")

        existing_by_name = self.task_type_repository.get_by_name(
            tenant_db,
            payload["name"],
        )
        if existing_by_name and (
            current_item is None or existing_by_name.id != current_item.id
        ):
            raise ValueError("Ya existe un tipo de tarea con ese nombre")
