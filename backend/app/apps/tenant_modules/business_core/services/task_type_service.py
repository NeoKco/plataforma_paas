from sqlalchemy.orm import Session

from app.apps.tenant_modules.business_core.models import (
    BusinessFunctionProfile,
    BusinessTaskType,
    BusinessTaskTypeFunctionProfile,
)
from app.apps.tenant_modules.business_core.repositories import (
    BusinessTaskTypeRepository,
)
from app.apps.tenant_modules.business_core.schemas import (
    BusinessTaskTypeCreateRequest,
    BusinessTaskTypeUpdateRequest,
)
from app.apps.tenant_modules.business_core.services.taxonomy_support import (
    build_internal_taxonomy_code,
    strip_legacy_visible_text,
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
        item = BusinessTaskType(
            **{key: value for key, value in normalized.items() if key != "compatible_function_profile_ids"}
        )
        saved = self.task_type_repository.save(tenant_db, item)
        self._replace_compatible_function_profiles(
            tenant_db,
            task_type_id=saved.id,
            function_profile_ids=normalized["compatible_function_profile_ids"],
        )
        return self.get_task_type(tenant_db, saved.id)

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
            if field == "compatible_function_profile_ids":
                continue
            setattr(item, field, value)
        saved = self.task_type_repository.save(tenant_db, item)
        self._replace_compatible_function_profiles(
            tenant_db,
            task_type_id=saved.id,
            function_profile_ids=normalized["compatible_function_profile_ids"],
        )
        return self.get_task_type(tenant_db, saved.id)

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
            "code": (
                payload.code.strip().lower()
                if payload.code and payload.code.strip()
                else build_internal_taxonomy_code("task", payload.name)
            ),
            "name": payload.name.strip(),
            "description": strip_legacy_visible_text(payload.description),
            "color": payload.color.strip() if payload.color and payload.color.strip() else None,
            "icon": payload.icon.strip() if payload.icon and payload.icon.strip() else None,
            "is_active": payload.is_active,
            "sort_order": payload.sort_order,
            "compatible_function_profile_ids": list(dict.fromkeys(payload.compatible_function_profile_ids)),
        }

    def _validate_payload(
        self,
        tenant_db: Session,
        payload: dict,
        *,
        current_item: BusinessTaskType | None = None,
    ) -> None:
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

        if payload["compatible_function_profile_ids"]:
            existing_profiles = (
                tenant_db.query(BusinessFunctionProfile.id)
                .filter(
                    BusinessFunctionProfile.id.in_(payload["compatible_function_profile_ids"])
                )
                .all()
            )
            existing_ids = {
                item[0] if isinstance(item, tuple) else getattr(item, "id", item)
                for item in existing_profiles
            }
            missing_ids = [
                item for item in payload["compatible_function_profile_ids"] if item not in existing_ids
            ]
            if missing_ids:
                raise ValueError(
                    "Uno o más perfiles funcionales compatibles ya no existen en el catálogo"
                )

    def get_task_type_compatible_profiles(
        self,
        tenant_db: Session,
        task_type_id: int,
    ) -> list[BusinessFunctionProfile]:
        return (
            tenant_db.query(BusinessFunctionProfile)
            .join(
                BusinessTaskTypeFunctionProfile,
                BusinessTaskTypeFunctionProfile.function_profile_id == BusinessFunctionProfile.id,
            )
            .filter(BusinessTaskTypeFunctionProfile.task_type_id == task_type_id)
            .order_by(BusinessFunctionProfile.sort_order.asc(), BusinessFunctionProfile.name.asc())
            .all()
        )

    def _replace_compatible_function_profiles(
        self,
        tenant_db: Session,
        *,
        task_type_id: int,
        function_profile_ids: list[int],
    ) -> None:
        (
            tenant_db.query(BusinessTaskTypeFunctionProfile)
            .filter(BusinessTaskTypeFunctionProfile.task_type_id == task_type_id)
            .delete(synchronize_session=False)
        )
        for function_profile_id in function_profile_ids:
            tenant_db.add(
                BusinessTaskTypeFunctionProfile(
                    task_type_id=task_type_id,
                    function_profile_id=function_profile_id,
                )
            )
        tenant_db.commit()
