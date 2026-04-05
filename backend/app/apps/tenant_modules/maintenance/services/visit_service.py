from sqlalchemy.orm import Session

from datetime import datetime, timezone

from app.apps.tenant_modules.business_core.models import BusinessWorkGroup, BusinessWorkGroupMember
from app.apps.tenant_modules.core.models.user import User
from app.apps.tenant_modules.maintenance.models import MaintenanceSchedule, MaintenanceWorkOrder, MaintenanceVisit
from app.apps.tenant_modules.maintenance.repositories import MaintenanceVisitRepository
from app.apps.tenant_modules.maintenance.services.assignment_capability import (
    validate_membership_task_type_capability,
)

from app.apps.tenant_modules.maintenance.schemas import (
    MaintenanceVisitCreateRequest,
    MaintenanceVisitUpdateRequest,
)

FINAL_WORK_ORDER_STATUSES = {"completed", "cancelled"}


class MaintenanceVisitService:
    def __init__(
        self,
        visit_repository: MaintenanceVisitRepository | None = None,
    ) -> None:
        self.visit_repository = visit_repository or MaintenanceVisitRepository()

    def list_visits(
        self,
        tenant_db: Session,
        *,
        work_order_id: int | None = None,
        visit_status: str | None = None,
    ) -> list[MaintenanceVisit]:
        return self.visit_repository.list_filtered(
            tenant_db,
            work_order_id=work_order_id,
            visit_status=visit_status.strip().lower() if visit_status else None,
        )

    def create_visit(
        self,
        tenant_db: Session,
        payload: MaintenanceVisitCreateRequest,
    ) -> MaintenanceVisit:
        normalized = self._normalize_payload(payload)
        self._validate_payload(tenant_db, normalized)
        item = MaintenanceVisit(**normalized)
        return self.visit_repository.save(tenant_db, item)

    def get_visit(
        self,
        tenant_db: Session,
        visit_id: int,
    ) -> MaintenanceVisit:
        return self._get_or_raise(tenant_db, visit_id)

    def update_visit(
        self,
        tenant_db: Session,
        visit_id: int,
        payload: MaintenanceVisitUpdateRequest,
    ) -> MaintenanceVisit:
        item = self._get_or_raise(tenant_db, visit_id)
        normalized = self._normalize_payload(payload)
        self._validate_payload(tenant_db, normalized, current_item=item)
        for field, value in normalized.items():
            setattr(item, field, value)
        return self.visit_repository.save(tenant_db, item)

    def delete_visit(
        self,
        tenant_db: Session,
        visit_id: int,
    ) -> MaintenanceVisit:
        item = self._get_or_raise(tenant_db, visit_id)
        work_order = self._get_work_order_or_raise(tenant_db, item.work_order_id)
        if work_order.maintenance_status in FINAL_WORK_ORDER_STATUSES:
            raise ValueError(
                "No puedes eliminar visitas de una mantencion cerrada o anulada"
            )
        self.visit_repository.delete(tenant_db, item)
        return item

    def _get_or_raise(self, tenant_db: Session, visit_id: int) -> MaintenanceVisit:
        item = self.visit_repository.get_by_id(tenant_db, visit_id)
        if item is None:
            raise ValueError("La visita solicitada no existe")
        return item

    def _get_work_order_or_raise(
        self,
        tenant_db: Session,
        work_order_id: int,
    ) -> MaintenanceWorkOrder:
        item = (
            tenant_db.query(MaintenanceWorkOrder)
            .filter(MaintenanceWorkOrder.id == work_order_id)
            .first()
        )
        if item is None:
            raise ValueError("La mantencion seleccionada no existe")
        return item

    def _normalize_payload(
        self,
        payload: MaintenanceVisitCreateRequest | MaintenanceVisitUpdateRequest,
    ) -> dict:
        return {
            "work_order_id": payload.work_order_id,
            "visit_status": payload.visit_status.strip().lower(),
            "scheduled_start_at": payload.scheduled_start_at,
            "scheduled_end_at": payload.scheduled_end_at,
            "actual_start_at": payload.actual_start_at,
            "actual_end_at": payload.actual_end_at,
            "assigned_work_group_id": payload.assigned_work_group_id,
            "assigned_tenant_user_id": payload.assigned_tenant_user_id,
            "assigned_group_label": payload.assigned_group_label.strip()
            if payload.assigned_group_label and payload.assigned_group_label.strip()
            else None,
            "notes": payload.notes.strip() if payload.notes and payload.notes.strip() else None,
        }

    def _validate_payload(
        self,
        tenant_db: Session,
        payload: dict,
        *,
        current_item: MaintenanceVisit | None = None,
    ) -> None:
        work_order = self._get_work_order_or_raise(tenant_db, payload["work_order_id"])
        if work_order.maintenance_status in FINAL_WORK_ORDER_STATUSES:
            raise ValueError(
                "No puedes programar o editar visitas sobre una mantencion cerrada o anulada"
            )
        if not payload["visit_status"]:
            raise ValueError("El estado de la visita es obligatorio")
        if (
            payload["scheduled_start_at"]
            and payload["scheduled_end_at"]
            and payload["scheduled_end_at"] < payload["scheduled_start_at"]
        ):
            raise ValueError("La fecha final programada no puede ser anterior al inicio")
        if (
            payload["actual_start_at"]
            and payload["actual_end_at"]
            and payload["actual_end_at"] < payload["actual_start_at"]
        ):
            raise ValueError("La fecha final real no puede ser anterior al inicio real")
        if (
            current_item is not None
            and current_item.work_order_id != payload["work_order_id"]
            and work_order.maintenance_status in FINAL_WORK_ORDER_STATUSES
        ):
            raise ValueError(
                "No puedes mover una visita a una mantencion cerrada o anulada"
            )
        if payload["assigned_work_group_id"] is not None:
            work_group = (
                tenant_db.query(BusinessWorkGroup)
                .filter(BusinessWorkGroup.id == payload["assigned_work_group_id"])
                .first()
            )
            if work_group is None:
                raise ValueError("El grupo responsable seleccionado no existe")
            payload["assigned_group_label"] = work_group.name
        if payload["assigned_tenant_user_id"] is not None:
            tenant_user_exists = (
                tenant_db.query(User.id)
                .filter(User.id == payload["assigned_tenant_user_id"])
                .first()
            )
            if tenant_user_exists is None:
                raise ValueError("El tecnico responsable seleccionado no existe")

        membership = self._validate_assignment_membership(tenant_db, payload)
        self._validate_task_type_assignment_capability(
            tenant_db,
            work_order,
            membership=membership,
        )

    def _validate_assignment_membership(
        self,
        tenant_db: Session,
        payload: dict,
    ) -> BusinessWorkGroupMember | None:
        assigned_work_group_id = payload.get("assigned_work_group_id")
        assigned_tenant_user_id = payload.get("assigned_tenant_user_id")
        if assigned_work_group_id is None or assigned_tenant_user_id is None:
            return None

        membership = (
            tenant_db.query(BusinessWorkGroupMember)
            .filter(BusinessWorkGroupMember.group_id == assigned_work_group_id)
            .filter(BusinessWorkGroupMember.tenant_user_id == assigned_tenant_user_id)
            .first()
        )
        if membership is None:
            raise ValueError(
                "El tecnico responsable seleccionado no pertenece al grupo responsable indicado"
            )
        if not getattr(membership, "is_active", True):
            raise ValueError(
                "El tecnico responsable seleccionado no tiene una membresía activa en el grupo responsable"
            )

        now = datetime.now(timezone.utc)
        starts_at = getattr(membership, "starts_at", None)
        ends_at = getattr(membership, "ends_at", None)
        if starts_at and starts_at > now:
            raise ValueError(
                "El tecnico responsable seleccionado aún no inicia su membresía activa en el grupo responsable"
            )
        if ends_at and ends_at < now:
            raise ValueError(
                "El tecnico responsable seleccionado ya no tiene una membresía vigente en el grupo responsable"
            )
        return membership

    def _validate_task_type_assignment_capability(
        self,
        tenant_db: Session,
        work_order: MaintenanceWorkOrder,
        *,
        membership: BusinessWorkGroupMember | None = None,
    ) -> None:
        if work_order.schedule_id is None or membership is None:
            return

        schedule = (
            tenant_db.query(MaintenanceSchedule)
            .filter(MaintenanceSchedule.id == work_order.schedule_id)
            .first()
        )
        if schedule is None:
            return
        validate_membership_task_type_capability(
            tenant_db,
            task_type_id=getattr(schedule, "task_type_id", None),
            membership=membership,
        )
