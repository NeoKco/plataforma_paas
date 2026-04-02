from sqlalchemy.orm import Session

from app.apps.tenant_modules.maintenance.models import (
    MaintenanceEquipmentType,
    MaintenanceInstallation,
)
from app.apps.tenant_modules.maintenance.repositories import (
    MaintenanceEquipmentTypeRepository,
)
from app.apps.tenant_modules.maintenance.schemas import (
    MaintenanceEquipmentTypeCreateRequest,
    MaintenanceEquipmentTypeUpdateRequest,
)


class MaintenanceEquipmentTypeService:
    def __init__(
        self,
        equipment_type_repository: MaintenanceEquipmentTypeRepository | None = None,
    ) -> None:
        self.equipment_type_repository = (
            equipment_type_repository or MaintenanceEquipmentTypeRepository()
        )

    def list_equipment_types(
        self,
        tenant_db: Session,
        *,
        include_inactive: bool = True,
    ) -> list[MaintenanceEquipmentType]:
        return self.equipment_type_repository.list_all(
            tenant_db,
            include_inactive=include_inactive,
        )

    def create_equipment_type(
        self,
        tenant_db: Session,
        payload: MaintenanceEquipmentTypeCreateRequest,
    ) -> MaintenanceEquipmentType:
        normalized = self._normalize_payload(payload)
        self._validate_payload(tenant_db, normalized)
        item = MaintenanceEquipmentType(**normalized)
        return self.equipment_type_repository.save(tenant_db, item)

    def get_equipment_type(
        self,
        tenant_db: Session,
        equipment_type_id: int,
    ) -> MaintenanceEquipmentType:
        return self._get_or_raise(tenant_db, equipment_type_id)

    def update_equipment_type(
        self,
        tenant_db: Session,
        equipment_type_id: int,
        payload: MaintenanceEquipmentTypeUpdateRequest,
    ) -> MaintenanceEquipmentType:
        item = self._get_or_raise(tenant_db, equipment_type_id)
        normalized = self._normalize_payload(payload)
        self._validate_payload(tenant_db, normalized, current_item=item)
        for field, value in normalized.items():
            setattr(item, field, value)
        return self.equipment_type_repository.save(tenant_db, item)

    def set_equipment_type_active(
        self,
        tenant_db: Session,
        equipment_type_id: int,
        is_active: bool,
    ) -> MaintenanceEquipmentType:
        item = self._get_or_raise(tenant_db, equipment_type_id)
        return self.equipment_type_repository.set_active(tenant_db, item, is_active)

    def delete_equipment_type(
        self,
        tenant_db: Session,
        equipment_type_id: int,
    ) -> MaintenanceEquipmentType:
        item = self._get_or_raise(tenant_db, equipment_type_id)
        has_installations = (
            tenant_db.query(MaintenanceInstallation.id)
            .filter(MaintenanceInstallation.equipment_type_id == item.id)
            .first()
        )
        if has_installations is not None:
            raise ValueError(
                "No puedes eliminar el tipo de equipo porque ya esta asociado a instalaciones"
            )
        self.equipment_type_repository.delete(tenant_db, item)
        return item

    def _get_or_raise(
        self,
        tenant_db: Session,
        equipment_type_id: int,
    ) -> MaintenanceEquipmentType:
        item = self.equipment_type_repository.get_by_id(tenant_db, equipment_type_id)
        if item is None:
            raise ValueError("El tipo de equipo solicitado no existe")
        return item

    def _normalize_payload(
        self,
        payload: MaintenanceEquipmentTypeCreateRequest | MaintenanceEquipmentTypeUpdateRequest,
    ) -> dict:
        return {
            "code": payload.code.strip().lower() if payload.code and payload.code.strip() else None,
            "name": payload.name.strip(),
            "description": payload.description.strip() if payload.description and payload.description.strip() else None,
            "is_active": payload.is_active,
            "sort_order": payload.sort_order,
        }

    def _validate_payload(
        self,
        tenant_db: Session,
        payload: dict,
        *,
        current_item: MaintenanceEquipmentType | None = None,
    ) -> None:
        if not payload["name"]:
            raise ValueError("El nombre del tipo de equipo es obligatorio")
        if payload["code"]:
            existing_by_code = self.equipment_type_repository.get_by_code(
                tenant_db,
                payload["code"],
            )
            if existing_by_code and (
                current_item is None or existing_by_code.id != current_item.id
            ):
                raise ValueError("Ya existe un tipo de equipo con ese codigo")

        existing_by_name = self.equipment_type_repository.get_by_name(
            tenant_db,
            payload["name"],
        )
        if existing_by_name and (
            current_item is None or existing_by_name.id != current_item.id
        ):
            raise ValueError("Ya existe un tipo de equipo con ese nombre")
