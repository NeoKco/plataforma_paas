from sqlalchemy.orm import Session

from app.apps.tenant_modules.business_core.models import BusinessSite
from app.apps.tenant_modules.maintenance.models import (
    MaintenanceEquipmentType,
    MaintenanceInstallation,
    MaintenanceWorkOrder,
)
from app.apps.tenant_modules.maintenance.repositories import (
    MaintenanceInstallationRepository,
)
from app.apps.tenant_modules.maintenance.schemas import (
    MaintenanceInstallationCreateRequest,
    MaintenanceInstallationUpdateRequest,
)


class MaintenanceInstallationService:
    def __init__(
        self,
        installation_repository: MaintenanceInstallationRepository | None = None,
    ) -> None:
        self.installation_repository = (
            installation_repository or MaintenanceInstallationRepository()
        )

    def list_installations(
        self,
        tenant_db: Session,
        *,
        site_id: int | None = None,
        equipment_type_id: int | None = None,
        include_inactive: bool = True,
    ) -> list[MaintenanceInstallation]:
        return self.installation_repository.list_filtered(
            tenant_db,
            site_id=site_id,
            equipment_type_id=equipment_type_id,
            include_inactive=include_inactive,
        )

    def create_installation(
        self,
        tenant_db: Session,
        payload: MaintenanceInstallationCreateRequest,
    ) -> MaintenanceInstallation:
        normalized = self._normalize_payload(payload)
        self._validate_payload(tenant_db, normalized)
        item = MaintenanceInstallation(**normalized)
        return self.installation_repository.save(tenant_db, item)

    def get_installation(
        self,
        tenant_db: Session,
        installation_id: int,
    ) -> MaintenanceInstallation:
        return self._get_or_raise(tenant_db, installation_id)

    def update_installation(
        self,
        tenant_db: Session,
        installation_id: int,
        payload: MaintenanceInstallationUpdateRequest,
    ) -> MaintenanceInstallation:
        item = self._get_or_raise(tenant_db, installation_id)
        normalized = self._normalize_payload(payload)
        self._validate_payload(tenant_db, normalized)
        for field, value in normalized.items():
            setattr(item, field, value)
        return self.installation_repository.save(tenant_db, item)

    def set_installation_active(
        self,
        tenant_db: Session,
        installation_id: int,
        is_active: bool,
    ) -> MaintenanceInstallation:
        item = self._get_or_raise(tenant_db, installation_id)
        return self.installation_repository.set_active(tenant_db, item, is_active)

    def delete_installation(
        self,
        tenant_db: Session,
        installation_id: int,
    ) -> MaintenanceInstallation:
        item = self._get_or_raise(tenant_db, installation_id)
        has_work_orders = (
            tenant_db.query(MaintenanceWorkOrder.id)
            .filter(MaintenanceWorkOrder.installation_id == item.id)
            .first()
        )
        if has_work_orders is not None:
            raise ValueError(
                "No puedes eliminar la instalacion porque ya esta asociada a mantenciones"
            )
        self.installation_repository.delete(tenant_db, item)
        return item

    def _get_or_raise(
        self,
        tenant_db: Session,
        installation_id: int,
    ) -> MaintenanceInstallation:
        item = self.installation_repository.get_by_id(tenant_db, installation_id)
        if item is None:
            raise ValueError("La instalacion solicitada no existe")
        return item

    def _normalize_payload(
        self,
        payload: MaintenanceInstallationCreateRequest | MaintenanceInstallationUpdateRequest,
    ) -> dict:
        return {
            "site_id": payload.site_id,
            "equipment_type_id": payload.equipment_type_id,
            "name": payload.name.strip(),
            "serial_number": payload.serial_number.strip() if payload.serial_number and payload.serial_number.strip() else None,
            "manufacturer": payload.manufacturer.strip() if payload.manufacturer and payload.manufacturer.strip() else None,
            "model": payload.model.strip() if payload.model and payload.model.strip() else None,
            "installed_at": payload.installed_at,
            "last_service_at": payload.last_service_at,
            "warranty_until": payload.warranty_until,
            "installation_status": payload.installation_status.strip().lower(),
            "location_note": payload.location_note.strip() if payload.location_note and payload.location_note.strip() else None,
            "technical_notes": payload.technical_notes.strip() if payload.technical_notes and payload.technical_notes.strip() else None,
            "is_active": payload.is_active,
            "sort_order": payload.sort_order,
        }

    def _validate_payload(self, tenant_db: Session, payload: dict) -> None:
        if not payload["name"]:
            raise ValueError("El nombre de la instalacion es obligatorio")
        site_exists = (
            tenant_db.query(BusinessSite.id)
            .filter(BusinessSite.id == payload["site_id"])
            .first()
        )
        if site_exists is None:
            raise ValueError("El sitio seleccionado no existe")
        equipment_type_exists = (
            tenant_db.query(MaintenanceEquipmentType.id)
            .filter(MaintenanceEquipmentType.id == payload["equipment_type_id"])
            .first()
        )
        if equipment_type_exists is None:
            raise ValueError("El tipo de equipo seleccionado no existe")
        if not payload["installation_status"]:
            raise ValueError("El estado de la instalacion es obligatorio")
