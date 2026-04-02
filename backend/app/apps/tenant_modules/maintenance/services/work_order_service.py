from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.apps.tenant_modules.business_core.models import BusinessClient, BusinessSite
from app.apps.tenant_modules.maintenance.models import (
    MaintenanceInstallation,
    MaintenanceWorkOrder,
)
from app.apps.tenant_modules.maintenance.repositories import (
    MaintenanceStatusLogRepository,
    MaintenanceVisitRepository,
    MaintenanceWorkOrderRepository,
)
from app.apps.tenant_modules.maintenance.schemas import (
    MaintenanceStatusUpdateRequest,
    MaintenanceWorkOrderCreateRequest,
    MaintenanceWorkOrderUpdateRequest,
)

FINAL_WORK_ORDER_STATUSES = {"completed", "cancelled"}


class MaintenanceWorkOrderService:
    def __init__(
        self,
        work_order_repository: MaintenanceWorkOrderRepository | None = None,
        status_log_repository: MaintenanceStatusLogRepository | None = None,
        visit_repository: MaintenanceVisitRepository | None = None,
    ) -> None:
        self.work_order_repository = work_order_repository or MaintenanceWorkOrderRepository()
        self.status_log_repository = status_log_repository or MaintenanceStatusLogRepository()
        self.visit_repository = visit_repository or MaintenanceVisitRepository()

    def list_work_orders(
        self,
        tenant_db: Session,
        *,
        client_id: int | None = None,
        site_id: int | None = None,
        maintenance_status: str | None = None,
    ) -> list[MaintenanceWorkOrder]:
        return self.work_order_repository.list_filtered(
            tenant_db,
            client_id=client_id,
            site_id=site_id,
            maintenance_status=maintenance_status.strip().lower() if maintenance_status else None,
        )

    def create_work_order(
        self,
        tenant_db: Session,
        payload: MaintenanceWorkOrderCreateRequest,
        *,
        created_by_user_id: int | None = None,
    ) -> MaintenanceWorkOrder:
        normalized = self._normalize_payload(payload)
        self._validate_payload(tenant_db, normalized)
        item = MaintenanceWorkOrder(
            **normalized,
            created_by_user_id=created_by_user_id,
        )
        tenant_db.add(item)
        tenant_db.flush()
        self.status_log_repository.create(
            tenant_db,
            work_order_id=item.id,
            from_status=None,
            to_status=item.maintenance_status,
            note="Orden creada",
            changed_by_user_id=created_by_user_id,
        )
        tenant_db.commit()
        tenant_db.refresh(item)
        return item

    def get_work_order(
        self,
        tenant_db: Session,
        work_order_id: int,
    ) -> MaintenanceWorkOrder:
        return self._get_or_raise(tenant_db, work_order_id)

    def update_work_order(
        self,
        tenant_db: Session,
        work_order_id: int,
        payload: MaintenanceWorkOrderUpdateRequest,
    ) -> MaintenanceWorkOrder:
        item = self._get_or_raise(tenant_db, work_order_id)
        if item.maintenance_status in FINAL_WORK_ORDER_STATUSES:
            raise ValueError(
                "No puedes editar una mantencion cerrada o anulada; reprograma o crea una nueva orden"
            )
        normalized = self._normalize_payload(payload)
        self._validate_payload(tenant_db, normalized, current_item=item)
        for field, value in normalized.items():
            setattr(item, field, value)
        return self.work_order_repository.save(tenant_db, item)

    def update_work_order_status(
        self,
        tenant_db: Session,
        work_order_id: int,
        payload: MaintenanceStatusUpdateRequest,
        *,
        changed_by_user_id: int | None = None,
    ) -> MaintenanceWorkOrder:
        item = self._get_or_raise(tenant_db, work_order_id)
        next_status = payload.maintenance_status.strip().lower()
        if not next_status:
            raise ValueError("El estado de la mantencion es obligatorio")
        previous_status = item.maintenance_status
        if previous_status == next_status:
            raise ValueError("La mantencion ya se encuentra en ese estado")

        item.maintenance_status = next_status
        if next_status == "completed":
            item.completed_at = datetime.now(timezone.utc)
            item.cancelled_at = None
        elif next_status == "cancelled":
            item.cancelled_at = datetime.now(timezone.utc)
        else:
            item.completed_at = None
            item.cancelled_at = None

        tenant_db.add(item)
        self.status_log_repository.create(
            tenant_db,
            work_order_id=item.id,
            from_status=previous_status,
            to_status=next_status,
            note=payload.note.strip() if payload.note and payload.note.strip() else None,
            changed_by_user_id=changed_by_user_id,
        )
        tenant_db.commit()
        tenant_db.refresh(item)
        return item

    def delete_work_order(
        self,
        tenant_db: Session,
        work_order_id: int,
    ) -> MaintenanceWorkOrder:
        item = self._get_or_raise(tenant_db, work_order_id)
        visit_count = self.visit_repository.count_by_work_order(tenant_db, item.id)
        status_log_count = self.status_log_repository.count_by_work_order(tenant_db, item.id)
        if visit_count > 0 or status_log_count > 1:
            raise ValueError(
                "No puedes eliminar la mantencion porque ya tiene trazabilidad; usa cambio de estado"
            )
        self.work_order_repository.delete(tenant_db, item)
        return item

    def _get_or_raise(
        self,
        tenant_db: Session,
        work_order_id: int,
    ) -> MaintenanceWorkOrder:
        item = self.work_order_repository.get_by_id(tenant_db, work_order_id)
        if item is None:
            raise ValueError("La mantencion solicitada no existe")
        return item

    def _normalize_payload(
        self,
        payload: MaintenanceWorkOrderCreateRequest | MaintenanceWorkOrderUpdateRequest,
    ) -> dict:
        normalized = {
            "client_id": payload.client_id,
            "site_id": payload.site_id,
            "installation_id": payload.installation_id,
            "external_reference": payload.external_reference.strip() if payload.external_reference and payload.external_reference.strip() else None,
            "title": payload.title.strip(),
            "description": payload.description.strip() if payload.description and payload.description.strip() else None,
            "priority": payload.priority.strip().lower(),
            "scheduled_for": payload.scheduled_for,
            "cancellation_reason": payload.cancellation_reason.strip() if payload.cancellation_reason and payload.cancellation_reason.strip() else None,
            "closure_notes": payload.closure_notes.strip() if payload.closure_notes and payload.closure_notes.strip() else None,
            "assigned_tenant_user_id": payload.assigned_tenant_user_id,
        }
        if isinstance(payload, MaintenanceWorkOrderCreateRequest):
            normalized["maintenance_status"] = payload.maintenance_status.strip().lower()
        return normalized

    def _validate_payload(
        self,
        tenant_db: Session,
        payload: dict,
        *,
        current_item: MaintenanceWorkOrder | None = None,
    ) -> None:
        if not payload["title"]:
            raise ValueError("El titulo de la mantencion es obligatorio")
        if not payload["priority"]:
            raise ValueError("La prioridad de la mantencion es obligatoria")

        client_exists = (
            tenant_db.query(BusinessClient.id)
            .filter(BusinessClient.id == payload["client_id"])
            .first()
        )
        if client_exists is None:
            raise ValueError("El cliente seleccionado no existe")

        site = (
            tenant_db.query(BusinessSite)
            .filter(BusinessSite.id == payload["site_id"])
            .first()
        )
        if site is None:
            raise ValueError("El sitio seleccionado no existe")
        if site.client_id != payload["client_id"]:
            raise ValueError("El sitio seleccionado no pertenece al cliente indicado")

        if payload["installation_id"] is not None:
            installation = (
                tenant_db.query(MaintenanceInstallation)
                .filter(MaintenanceInstallation.id == payload["installation_id"])
                .first()
            )
            if installation is None:
                raise ValueError("La instalacion seleccionada no existe")
            if installation.site_id != payload["site_id"]:
                raise ValueError("La instalacion seleccionada no pertenece al sitio indicado")

        if "maintenance_status" in payload:
            if not payload["maintenance_status"]:
                raise ValueError("El estado inicial de la mantencion es obligatorio")

        if payload["external_reference"]:
            existing = self.work_order_repository.get_by_external_reference(
                tenant_db,
                payload["external_reference"],
            )
            if existing and (current_item is None or existing.id != current_item.id):
                raise ValueError("Ya existe una mantencion con esa referencia externa")
