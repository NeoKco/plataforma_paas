from datetime import datetime, timedelta, timezone
import zlib

from sqlalchemy.orm import Session
from sqlalchemy import text

from app.apps.tenant_modules.business_core.models import (
    BusinessClient,
    BusinessSite,
    BusinessWorkGroup,
    BusinessWorkGroupMember,
)
from app.apps.tenant_modules.core.models.user import User
from app.apps.tenant_modules.maintenance.models import (
    MaintenanceDueItem,
    MaintenanceInstallation,
    MaintenanceSchedule,
    MaintenanceWorkOrder,
)
from app.apps.tenant_modules.maintenance.services.assignment_capability import (
    validate_membership_task_type_capability,
)
from app.apps.tenant_modules.maintenance.services.costing_service import (
    MaintenanceCostingService,
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
ACTIVE_WORK_ORDER_STATUSES = {"scheduled", "in_progress"}
REOPEN_ALLOWED_ROLES = {"admin", "manager"}
LEGACY_REFERENCE_PREFIXES = ("legacy-", "legacy_")
CONFLICT_LOCK_NAMESPACES = {
    "installation": 4101,
    "group": 4102,
    "technician": 4103,
}


class MaintenanceWorkOrderConflictError(ValueError):
    pass


class MaintenanceWorkOrderService:
    def __init__(
        self,
        work_order_repository: MaintenanceWorkOrderRepository | None = None,
        status_log_repository: MaintenanceStatusLogRepository | None = None,
        visit_repository: MaintenanceVisitRepository | None = None,
        costing_service: MaintenanceCostingService | None = None,
    ) -> None:
        self.work_order_repository = work_order_repository or MaintenanceWorkOrderRepository()
        self.status_log_repository = status_log_repository or MaintenanceStatusLogRepository()
        self.visit_repository = visit_repository or MaintenanceVisitRepository()
        self.costing_service = costing_service or MaintenanceCostingService()

    def list_work_orders(
        self,
        tenant_db: Session,
        *,
        client_id: int | None = None,
        site_id: int | None = None,
        installation_id: int | None = None,
        maintenance_status: str | None = None,
    ) -> list[MaintenanceWorkOrder]:
        return self.work_order_repository.list_filtered(
            tenant_db,
            client_id=client_id,
            site_id=site_id,
            installation_id=installation_id,
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
        *,
        changed_by_user_id: int | None = None,
    ) -> MaintenanceWorkOrder:
        item = self._get_or_raise(tenant_db, work_order_id)
        normalized = self._normalize_payload(payload)
        normalized["external_reference"] = item.external_reference
        if item.maintenance_status in FINAL_WORK_ORDER_STATUSES:
            item.description = normalized["description"]
            item.closure_notes = normalized["closure_notes"]
            item.cancellation_reason = normalized["cancellation_reason"]
            return self.work_order_repository.save(tenant_db, item)
        self._validate_payload(tenant_db, normalized, current_item=item)
        reschedule_note = self._build_reschedule_audit_note(
            item,
            normalized,
            payload.reschedule_note,
        )
        for field, value in normalized.items():
            setattr(item, field, value)
        saved = self.work_order_repository.save(tenant_db, item)
        if reschedule_note:
            self.status_log_repository.create(
                tenant_db,
                work_order_id=saved.id,
                from_status=saved.maintenance_status,
                to_status=saved.maintenance_status,
                note=reschedule_note,
                changed_by_user_id=changed_by_user_id,
            )
            tenant_db.commit()
            tenant_db.refresh(saved)
        return saved

    def update_work_order_status(
        self,
        tenant_db: Session,
        work_order_id: int,
        payload: MaintenanceStatusUpdateRequest,
        *,
        changed_by_user_id: int | None = None,
        actor_role: str | None = None,
    ) -> MaintenanceWorkOrder:
        item = self._get_or_raise(tenant_db, work_order_id)
        next_status = payload.maintenance_status.strip().lower()
        if not next_status:
            raise ValueError("El estado de la mantencion es obligatorio")
        previous_status = item.maintenance_status
        if previous_status == next_status:
            raise ValueError("La mantencion ya se encuentra en ese estado")
        if (
            previous_status in FINAL_WORK_ORDER_STATUSES
            and next_status in ACTIVE_WORK_ORDER_STATUSES
            and actor_role not in REOPEN_ALLOWED_ROLES
        ):
            raise ValueError(
                "Solo perfiles administrativos pueden reabrir mantenciones desde historial"
            )

        self._validate_status_transition_conflicts(
            tenant_db,
            item,
            next_status,
        )

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
        note = payload.note.strip() if payload.note and payload.note.strip() else None
        follow_up_changes = False
        if item.due_item_id and next_status in {"completed", "cancelled"}:
            due_item = (
                tenant_db.query(MaintenanceDueItem)
                .filter(MaintenanceDueItem.id == item.due_item_id)
                .first()
            )
            if due_item is not None:
                due_item.due_status = "completed" if next_status == "completed" else "cancelled"
                if note:
                    due_item.resolution_note = note
                tenant_db.add(due_item)
                follow_up_changes = True
        if next_status == "completed" and item.schedule_id:
            schedule = (
                tenant_db.query(MaintenanceSchedule)
                .filter(MaintenanceSchedule.id == item.schedule_id)
                .first()
            )
            if schedule is not None:
                completed_at = item.completed_at or datetime.now(timezone.utc)
                schedule.last_executed_at = completed_at
                schedule.next_due_at = self._add_frequency(
                    completed_at,
                    schedule.frequency_value,
                    schedule.frequency_unit,
                )
                tenant_db.add(schedule)
                follow_up_changes = True
        if follow_up_changes:
            tenant_db.commit()
            tenant_db.refresh(item)
        if next_status == "completed":
            self.costing_service.maybe_auto_sync_by_tenant_policy(
                tenant_db,
                item.id,
                actor_user_id=changed_by_user_id,
            )
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
            "assigned_work_group_id": payload.assigned_work_group_id,
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
        if payload["installation_id"] is None:
            raise ValueError(
                "Debes seleccionar una instalacion antes de agendar la mantencion"
            )

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

        if payload["assigned_work_group_id"] is not None:
            work_group_exists = (
                tenant_db.query(BusinessWorkGroup.id)
                .filter(BusinessWorkGroup.id == payload["assigned_work_group_id"])
                .first()
            )
            if work_group_exists is None:
                raise ValueError("El grupo responsable seleccionado no existe")

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
            payload,
            current_item=current_item,
            membership=membership,
        )

        if "maintenance_status" in payload:
            if not payload["maintenance_status"]:
                raise ValueError("El estado inicial de la mantencion es obligatorio")

        if payload["external_reference"]:
            normalized_reference = payload["external_reference"].strip().lower()
            is_current_legacy_reference = (
                current_item is not None
                and current_item.external_reference == payload["external_reference"]
            )
            if normalized_reference.startswith(LEGACY_REFERENCE_PREFIXES) and not is_current_legacy_reference:
                raise ValueError(
                    "La referencia externa legacy es interna y no puede capturarse manualmente"
                )
            existing = self.work_order_repository.get_by_external_reference(
                tenant_db,
                payload["external_reference"],
            )
            if existing and (current_item is None or existing.id != current_item.id):
                raise ValueError("Ya existe una mantencion con esa referencia externa")

        effective_status = payload.get("maintenance_status") or getattr(
            current_item,
            "maintenance_status",
            None,
        )
        self._validate_scheduling_conflicts(
            tenant_db,
            payload,
            maintenance_status=effective_status,
            current_item=current_item,
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
        payload: dict,
        *,
        current_item: MaintenanceWorkOrder | None = None,
        membership: BusinessWorkGroupMember | None = None,
    ) -> None:
        assigned_work_group_id = payload.get("assigned_work_group_id")
        assigned_tenant_user_id = payload.get("assigned_tenant_user_id")
        if assigned_work_group_id is None or assigned_tenant_user_id is None:
            return

        schedule_id = getattr(current_item, "schedule_id", None)
        if schedule_id is None:
            return

        schedule = (
            tenant_db.query(MaintenanceSchedule)
            .filter(MaintenanceSchedule.id == schedule_id)
            .first()
        )
        if schedule is None:
            return

        effective_membership = membership or (
            tenant_db.query(BusinessWorkGroupMember)
            .filter(BusinessWorkGroupMember.group_id == assigned_work_group_id)
            .filter(BusinessWorkGroupMember.tenant_user_id == assigned_tenant_user_id)
            .first()
        )
        if effective_membership is None:
            return
        validate_membership_task_type_capability(
            tenant_db,
            task_type_id=getattr(schedule, "task_type_id", None),
            membership=effective_membership,
        )

    def _validate_status_transition_conflicts(
        self,
        tenant_db: Session,
        current_item: MaintenanceWorkOrder,
        next_status: str,
    ) -> None:
        payload = {
            "scheduled_for": getattr(current_item, "scheduled_for", None),
            "installation_id": getattr(current_item, "installation_id", None),
            "assigned_work_group_id": getattr(current_item, "assigned_work_group_id", None),
            "assigned_tenant_user_id": getattr(current_item, "assigned_tenant_user_id", None),
        }
        self._validate_scheduling_conflicts(
            tenant_db,
            payload,
            maintenance_status=next_status,
            current_item=current_item,
        )

    def _validate_scheduling_conflicts(
        self,
        tenant_db: Session,
        payload: dict,
        *,
        maintenance_status: str | None,
        current_item: MaintenanceWorkOrder | None = None,
    ) -> None:
        if maintenance_status not in ACTIVE_WORK_ORDER_STATUSES:
            return
        scheduled_for = payload.get("scheduled_for")
        if scheduled_for is None:
            return

        self._acquire_scheduling_conflict_locks(tenant_db, payload)

        conflicts = self.work_order_repository.list_active_conflicts(
            tenant_db,
            scheduled_for=scheduled_for,
            installation_id=payload.get("installation_id"),
            assigned_work_group_id=payload.get("assigned_work_group_id"),
            assigned_tenant_user_id=payload.get("assigned_tenant_user_id"),
            exclude_work_order_id=getattr(current_item, "id", None),
        )
        if not conflicts:
            return

        reason_keys = self._collect_conflict_reason_keys(payload, conflicts)
        raise MaintenanceWorkOrderConflictError(
            self._build_conflict_message(len(conflicts), reason_keys)
        )

    def _acquire_scheduling_conflict_locks(self, tenant_db: Session, payload: dict) -> None:
        dialect_name = getattr(
            getattr(getattr(getattr(tenant_db, "bind", None), "dialect", None), "name", None),
            "lower",
            None,
        )
        if dialect_name is None or dialect_name() != "postgresql":
            return
        if not hasattr(tenant_db, "execute"):
            return

        scheduled_for = self._coerce_datetime(payload.get("scheduled_for"))
        if scheduled_for is None:
            return

        minute_bucket = int(
            scheduled_for.astimezone(timezone.utc).replace(second=0, microsecond=0).timestamp() // 60
        )
        lock_targets: list[tuple[str, int]] = []
        if payload.get("installation_id") is not None:
            lock_targets.append(("installation", int(payload["installation_id"])))
        if payload.get("assigned_work_group_id") is not None:
            lock_targets.append(("group", int(payload["assigned_work_group_id"])))
        if payload.get("assigned_tenant_user_id") is not None:
            lock_targets.append(("technician", int(payload["assigned_tenant_user_id"])))

        for resource_type, resource_id in lock_targets:
            namespace = CONFLICT_LOCK_NAMESPACES[resource_type]
            resource_key = self._build_conflict_lock_key(resource_type, resource_id, minute_bucket)
            tenant_db.execute(
                text("SELECT pg_advisory_xact_lock(:namespace, :resource_key)"),
                {"namespace": namespace, "resource_key": resource_key},
            )

    def _build_conflict_lock_key(
        self,
        resource_type: str,
        resource_id: int,
        minute_bucket: int,
    ) -> int:
        raw_value = zlib.crc32(f"{resource_type}:{resource_id}:{minute_bucket}".encode("utf-8"))
        return raw_value if raw_value <= 2_147_483_647 else raw_value - 4_294_967_296

    def _coerce_datetime(self, value) -> datetime | None:
        if value is None:
            return None
        if isinstance(value, datetime):
            return value if value.tzinfo is not None else value.replace(tzinfo=timezone.utc)
        if isinstance(value, str):
            normalized = value.replace("Z", "+00:00")
            parsed = datetime.fromisoformat(normalized)
            return parsed if parsed.tzinfo is not None else parsed.replace(tzinfo=timezone.utc)
        return None

    def _collect_conflict_reason_keys(
        self,
        payload: dict,
        conflicts: list[MaintenanceWorkOrder],
    ) -> list[str]:
        reasons: list[str] = []
        installation_id = payload.get("installation_id")
        assigned_work_group_id = payload.get("assigned_work_group_id")
        assigned_tenant_user_id = payload.get("assigned_tenant_user_id")

        for conflict in conflicts:
            if installation_id is not None and conflict.installation_id == installation_id:
                reasons.append("installation")
            if (
                assigned_work_group_id is not None
                and conflict.assigned_work_group_id == assigned_work_group_id
            ):
                reasons.append("group")
            if (
                assigned_tenant_user_id is not None
                and conflict.assigned_tenant_user_id == assigned_tenant_user_id
            ):
                reasons.append("technician")

        ordered_keys = ["installation", "group", "technician"]
        return [key for key in ordered_keys if key in reasons]

    def _build_conflict_message(self, conflict_count: int, reason_keys: list[str]) -> str:
        labels = {
            "installation": "instalación",
            "group": "grupo responsable",
            "technician": "técnico responsable",
        }
        normalized_reasons = [labels[key] for key in reason_keys if key in labels]
        if not normalized_reasons:
            normalized_reasons = ["agenda técnica"]

        if len(normalized_reasons) == 1:
            reason_text = normalized_reasons[0]
        elif len(normalized_reasons) == 2:
            reason_text = f"{normalized_reasons[0]} y {normalized_reasons[1]}"
        else:
            reason_text = ", ".join(normalized_reasons[:-1]) + f" y {normalized_reasons[-1]}"

        return (
            "El horario seleccionado ya cruza con "
            f"{conflict_count} mantención(es) abierta(s) por {reason_text}. "
            "Ajusta la fecha/hora o reasigna los recursos antes de guardar."
        )

    def _build_reschedule_audit_note(
        self,
        current_item: MaintenanceWorkOrder,
        normalized_payload: dict,
        requested_note: str | None,
    ) -> str | None:
        if current_item.maintenance_status not in ACTIVE_WORK_ORDER_STATUSES:
            return None

        changes: list[str] = []
        previous_schedule = getattr(current_item, "scheduled_for", None)
        next_schedule = normalized_payload.get("scheduled_for")
        if previous_schedule != next_schedule:
            changes.append(
                "fecha/hora: "
                f"{self._format_audit_value(previous_schedule)} -> {self._format_audit_value(next_schedule)}"
            )

        previous_installation = getattr(current_item, "installation_id", None)
        next_installation = normalized_payload.get("installation_id")
        if previous_installation != next_installation:
            changes.append(
                f"instalación: {self._format_audit_value(previous_installation)} -> {self._format_audit_value(next_installation)}"
            )

        previous_group = getattr(current_item, "assigned_work_group_id", None)
        next_group = normalized_payload.get("assigned_work_group_id")
        if previous_group != next_group:
            changes.append(
                f"grupo: {self._format_audit_value(previous_group)} -> {self._format_audit_value(next_group)}"
            )

        previous_technician = getattr(current_item, "assigned_tenant_user_id", None)
        next_technician = normalized_payload.get("assigned_tenant_user_id")
        if previous_technician != next_technician:
            changes.append(
                "técnico: "
                f"{self._format_audit_value(previous_technician)} -> {self._format_audit_value(next_technician)}"
            )

        if not changes:
            return None

        base_note = "Reprogramación: " + "; ".join(changes)
        trimmed_note = requested_note.strip() if requested_note and requested_note.strip() else None
        if trimmed_note:
            return f"{base_note}. Motivo: {trimmed_note}"
        return base_note

    def _format_audit_value(self, value) -> str:
        if value is None:
            return "sin asignar"
        if isinstance(value, datetime):
            return value.isoformat()
        return str(value)

    def _add_frequency(self, value: datetime, frequency_value: int, frequency_unit: str) -> datetime:
        if frequency_unit == "days":
            return value + timedelta(days=frequency_value)
        if frequency_unit == "weeks":
            return value + timedelta(weeks=frequency_value)
        if frequency_unit == "months":
            return self._shift_months(value, frequency_value)
        if frequency_unit == "years":
            return self._shift_months(value, frequency_value * 12)
        raise ValueError("La unidad de frecuencia no es valida")

    def _shift_months(self, value: datetime, months: int) -> datetime:
        month_index = value.month - 1 + months
        year = value.year + month_index // 12
        month = month_index % 12 + 1
        day = min(value.day, self._days_in_month(year, month))
        return value.replace(year=year, month=month, day=day)

    def _days_in_month(self, year: int, month: int) -> int:
        if month == 2:
            if year % 400 == 0 or (year % 4 == 0 and year % 100 != 0):
                return 29
            return 28
        if month in {4, 6, 9, 11}:
            return 30
        return 31
