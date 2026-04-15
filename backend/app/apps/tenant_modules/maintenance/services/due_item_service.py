from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.apps.tenant_modules.business_core.models import BusinessWorkGroup, BusinessWorkGroupMember
from app.apps.tenant_modules.core.models.user import User
from app.apps.tenant_modules.maintenance.models import (
    MaintenanceDueItem,
    MaintenanceSchedule,
)
from app.apps.tenant_modules.maintenance.repositories import (
    MaintenanceDueItemRepository,
    MaintenanceScheduleRepository,
    MaintenanceWorkOrderRepository,
)
from app.apps.tenant_modules.maintenance.schemas import (
    MaintenanceDueItemContactRequest,
    MaintenanceDueItemPostponeRequest,
    MaintenanceDueItemScheduleRequest,
    MaintenanceWorkOrderCreateRequest,
)
from app.apps.tenant_modules.maintenance.services.work_order_service import (
    MaintenanceWorkOrderService,
)
from app.apps.tenant_modules.maintenance.services.assignment_capability import (
    validate_membership_task_type_capability,
)
from app.apps.tenant_modules.maintenance.services.costing_service import (
    MaintenanceCostingService,
)


class MaintenanceDueItemService:
    def __init__(
        self,
        due_item_repository: MaintenanceDueItemRepository | None = None,
        schedule_repository: MaintenanceScheduleRepository | None = None,
        work_order_repository: MaintenanceWorkOrderRepository | None = None,
        work_order_service: MaintenanceWorkOrderService | None = None,
        costing_service: MaintenanceCostingService | None = None,
    ) -> None:
        self.due_item_repository = due_item_repository or MaintenanceDueItemRepository()
        self.schedule_repository = schedule_repository or MaintenanceScheduleRepository()
        self.work_order_repository = work_order_repository or MaintenanceWorkOrderRepository()
        self.work_order_service = work_order_service or MaintenanceWorkOrderService()
        self.costing_service = costing_service or MaintenanceCostingService()

    def list_due_items(
        self,
        tenant_db: Session,
        *,
        client_id: int | None = None,
        site_id: int | None = None,
        due_status: str | None = None,
        now: datetime | None = None,
    ) -> list[tuple[MaintenanceDueItem, MaintenanceSchedule]]:
        effective_now = now or datetime.now(timezone.utc)
        self.generate_due_items(tenant_db, now=effective_now)
        items = self.due_item_repository.list_filtered(
            tenant_db,
            client_id=client_id,
            site_id=site_id,
            due_status=due_status,
            visible_only=True,
            now=effective_now,
        )
        schedule_ids = {item.schedule_id for item in items}
        schedules = {
            schedule.id: schedule
            for schedule in self.schedule_repository.list_filtered(
                tenant_db,
                include_inactive=True,
            )
            if schedule.id in schedule_ids
        }
        return [(item, schedules[item.schedule_id]) for item in items if item.schedule_id in schedules]

    def get_due_item(
        self,
        tenant_db: Session,
        due_item_id: int,
    ) -> tuple[MaintenanceDueItem, MaintenanceSchedule]:
        item = self._get_due_item_or_raise(tenant_db, due_item_id)
        schedule = self._get_schedule_or_raise(tenant_db, item.schedule_id)
        return item, schedule

    def update_contact(
        self,
        tenant_db: Session,
        due_item_id: int,
        payload: MaintenanceDueItemContactRequest,
    ) -> MaintenanceDueItem:
        item = self._get_due_item_or_raise(tenant_db, due_item_id)
        if item.due_status not in {"upcoming", "due", "contacted", "postponed"}:
            raise ValueError("Solo puedes gestionar contacto sobre pendientes activos")
        item.contact_status = payload.contact_status.strip().lower()
        item.contact_note = payload.contact_note.strip() if payload.contact_note and payload.contact_note.strip() else None
        if item.contact_status not in {"not_contacted", "contact_pending", "contacted", "pending_confirmation", "confirmed", "no_response", "rejected"}:
            raise ValueError("El estado de contacto no es valido")
        if item.due_status in {"upcoming", "due"} and item.contact_status != "not_contacted":
            item.due_status = "contacted"
        return self.due_item_repository.save(tenant_db, item)

    def postpone_due_item(
        self,
        tenant_db: Session,
        due_item_id: int,
        payload: MaintenanceDueItemPostponeRequest,
    ) -> MaintenanceDueItem:
        item = self._get_due_item_or_raise(tenant_db, due_item_id)
        if item.work_order_id is not None:
            raise ValueError("La mantencion ya fue agendada y no puede posponerse desde pendientes")
        if payload.postponed_until <= datetime.now(timezone.utc):
            raise ValueError("La nueva fecha debe estar en el futuro")
        item.postponed_until = payload.postponed_until
        item.visible_from = payload.postponed_until
        item.due_status = "postponed"
        item.resolution_note = payload.resolution_note.strip() if payload.resolution_note and payload.resolution_note.strip() else None
        return self.due_item_repository.save(tenant_db, item)

    def schedule_due_item(
        self,
        tenant_db: Session,
        due_item_id: int,
        payload: MaintenanceDueItemScheduleRequest,
        *,
        created_by_user_id: int | None = None,
    ) -> tuple[MaintenanceDueItem, object]:
        item = self._get_due_item_or_raise(tenant_db, due_item_id)
        schedule = self._get_schedule_or_raise(tenant_db, item.schedule_id)
        if item.work_order_id is not None:
            raise ValueError("La mantencion pendiente ya fue agendada")
        site_id = payload.site_id or item.site_id or schedule.site_id
        installation_id = payload.installation_id or item.installation_id or schedule.installation_id
        if payload.assigned_work_group_id is not None:
            work_group_exists = (
                tenant_db.query(BusinessWorkGroup.id)
                .filter(BusinessWorkGroup.id == payload.assigned_work_group_id)
                .first()
            )
            if work_group_exists is None:
                raise ValueError("El grupo responsable seleccionado no existe")
        if payload.assigned_tenant_user_id is not None:
            tenant_user_exists = (
                tenant_db.query(User.id)
                .filter(User.id == payload.assigned_tenant_user_id)
                .first()
            )
            if tenant_user_exists is None:
                raise ValueError("El tecnico responsable seleccionado no existe")

        effective_assigned_work_group_id = payload.assigned_work_group_id or item.assigned_work_group_id
        effective_assigned_tenant_user_id = payload.assigned_tenant_user_id or item.assigned_tenant_user_id
        self._validate_task_type_assignment_capability(
            tenant_db,
            schedule,
            assigned_work_group_id=effective_assigned_work_group_id,
            assigned_tenant_user_id=effective_assigned_tenant_user_id,
        )

        work_order = self.work_order_service.create_work_order(
            tenant_db,
            MaintenanceWorkOrderCreateRequest(
                client_id=item.client_id,
                site_id=site_id or 0,
                installation_id=installation_id,
                task_type_id=getattr(schedule, "task_type_id", None),
                assigned_work_group_id=payload.assigned_work_group_id or item.assigned_work_group_id,
                assigned_tenant_user_id=payload.assigned_tenant_user_id or item.assigned_tenant_user_id,
                external_reference=None,
                title=(payload.title or schedule.name).strip(),
                description=(
                    payload.description.strip()
                    if payload.description and payload.description.strip()
                    else schedule.description
                ),
                priority=(payload.priority or schedule.default_priority).strip().lower(),
                scheduled_for=payload.scheduled_for or item.due_at,
                maintenance_status="scheduled",
            ),
            created_by_user_id=created_by_user_id,
        )
        work_order.schedule_id = schedule.id
        work_order.due_item_id = item.id
        work_order.billing_mode = schedule.billing_mode
        work_order = self.work_order_repository.save(tenant_db, work_order)
        self.costing_service.seed_estimate_from_schedule(
            tenant_db,
            work_order.id,
            schedule.id,
            actor_user_id=created_by_user_id,
        )

        item.site_id = site_id
        item.installation_id = installation_id
        item.assigned_work_group_id = work_order.assigned_work_group_id
        item.assigned_tenant_user_id = work_order.assigned_tenant_user_id
        item.work_order_id = work_order.id
        item.due_status = "scheduled"
        saved_due_item = self.due_item_repository.save(tenant_db, item)
        return saved_due_item, work_order

    def _validate_task_type_assignment_capability(
        self,
        tenant_db: Session,
        schedule: MaintenanceSchedule,
        *,
        assigned_work_group_id: int | None,
        assigned_tenant_user_id: int | None,
    ) -> None:
        if assigned_work_group_id is None or assigned_tenant_user_id is None:
            return

        membership = (
            tenant_db.query(BusinessWorkGroupMember)
            .filter(BusinessWorkGroupMember.group_id == assigned_work_group_id)
            .filter(BusinessWorkGroupMember.tenant_user_id == assigned_tenant_user_id)
            .first()
        )
        if membership is None:
            return
        validate_membership_task_type_capability(
            tenant_db,
            task_type_id=getattr(schedule, "task_type_id", None),
            membership=membership,
        )

    def generate_due_items(
        self,
        tenant_db: Session,
        *,
        now: datetime | None = None,
    ) -> list[MaintenanceDueItem]:
        effective_now = now or datetime.now(timezone.utc)
        generated: list[MaintenanceDueItem] = []
        for schedule in self.schedule_repository.list_active(tenant_db):
            due_item = self._sync_schedule_due_item(tenant_db, schedule, effective_now)
            if due_item is not None:
                generated.append(due_item)
        return generated

    def _sync_schedule_due_item(
        self,
        tenant_db: Session,
        schedule: MaintenanceSchedule,
        now: datetime,
    ) -> MaintenanceDueItem | None:
        if not schedule.auto_create_due_items or not schedule.is_active:
            return None
        visible_from = schedule.next_due_at - timedelta(days=schedule.lead_days)
        if now < visible_from:
            return None
        due_status = "due" if now >= schedule.next_due_at else "upcoming"
        existing = self.due_item_repository.get_open_for_cycle(
            tenant_db,
            schedule_id=schedule.id,
            due_at=schedule.next_due_at,
        )
        if existing is not None:
            existing.client_id = schedule.client_id
            existing.site_id = schedule.site_id
            existing.installation_id = schedule.installation_id
            existing.visible_from = visible_from
            if existing.work_order_id is None and existing.due_status not in {"contacted", "postponed"}:
                existing.due_status = due_status
            return self.due_item_repository.save(tenant_db, existing)

        item = MaintenanceDueItem(
            schedule_id=schedule.id,
            client_id=schedule.client_id,
            site_id=schedule.site_id,
            installation_id=schedule.installation_id,
            due_at=schedule.next_due_at,
            visible_from=visible_from,
            due_status=due_status,
            contact_status="not_contacted",
            assigned_work_group_id=None,
            assigned_tenant_user_id=None,
            work_order_id=None,
            postponed_until=None,
            contact_note=None,
            resolution_note=None,
        )
        return self.due_item_repository.save(tenant_db, item)

    def _get_due_item_or_raise(self, tenant_db: Session, due_item_id: int) -> MaintenanceDueItem:
        item = self.due_item_repository.get_by_id(tenant_db, due_item_id)
        if item is None:
            raise ValueError("La mantencion pendiente solicitada no existe")
        return item

    def _get_schedule_or_raise(self, tenant_db: Session, schedule_id: int) -> MaintenanceSchedule:
        schedule = self.schedule_repository.get_by_id(tenant_db, schedule_id)
        if schedule is None:
            raise ValueError("La programacion solicitada no existe")
        return schedule
