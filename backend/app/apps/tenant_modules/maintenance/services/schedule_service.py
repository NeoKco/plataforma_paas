from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.apps.tenant_modules.business_core.models import (
    BusinessClient,
    BusinessSite,
    BusinessTaskType,
)
from app.apps.tenant_modules.maintenance.models import (
    MaintenanceInstallation,
    MaintenanceSchedule,
    MaintenanceWorkOrder,
)
from app.apps.tenant_modules.maintenance.repositories import (
    MaintenanceScheduleRepository,
)
from app.apps.tenant_modules.maintenance.schemas import (
    MaintenanceScheduleCreateRequest,
    MaintenanceScheduleUpdateRequest,
)

VALID_FREQUENCY_UNITS = {"days", "weeks", "months", "years"}
VALID_BILLING_MODES = {"per_work_order", "contract", "warranty", "no_charge"}


class MaintenanceScheduleService:
    def __init__(
        self,
        schedule_repository: MaintenanceScheduleRepository | None = None,
    ) -> None:
        self.schedule_repository = schedule_repository or MaintenanceScheduleRepository()

    def list_schedules(
        self,
        tenant_db: Session,
        *,
        client_id: int | None = None,
        site_id: int | None = None,
        installation_id: int | None = None,
        include_inactive: bool = True,
    ) -> list[MaintenanceSchedule]:
        return self.schedule_repository.list_filtered(
            tenant_db,
            client_id=client_id,
            site_id=site_id,
            installation_id=installation_id,
            include_inactive=include_inactive,
        )

    def create_schedule(
        self,
        tenant_db: Session,
        payload: MaintenanceScheduleCreateRequest,
        *,
        created_by_user_id: int | None = None,
    ) -> MaintenanceSchedule:
        normalized = self._normalize_payload(payload)
        self._validate_payload(tenant_db, normalized)
        equivalent = self.schedule_repository.find_equivalent_active(
            tenant_db,
            client_id=normalized["client_id"],
            site_id=normalized["site_id"],
            installation_id=normalized["installation_id"],
            task_type_id=normalized["task_type_id"],
            frequency_value=normalized["frequency_value"],
            frequency_unit=normalized["frequency_unit"],
        )
        if equivalent is not None:
            raise ValueError("Ya existe una programacion activa equivalente para este cliente")
        item = MaintenanceSchedule(**normalized, created_by_user_id=created_by_user_id)
        tenant_db.add(item)
        tenant_db.commit()
        tenant_db.refresh(item)
        return item

    def suggest_schedule_seed(
        self,
        tenant_db: Session,
        *,
        client_id: int,
        site_id: int | None = None,
        installation_id: int | None = None,
    ) -> dict:
        reference_work_order = None
        if installation_id is not None:
            reference_work_order = self._get_latest_completed_work_order(
                tenant_db,
                client_id=client_id,
                site_id=site_id,
                installation_id=installation_id,
            )
        if reference_work_order is None:
            reference_work_order = self._get_latest_completed_work_order(
                tenant_db,
                client_id=client_id,
                site_id=site_id,
                installation_id=None,
            )
        reference_completed_at = self._get_work_order_reference_date(reference_work_order)
        if reference_completed_at is not None and reference_completed_at.year == datetime.now(timezone.utc).year:
            return {
                "client_id": client_id,
                "site_id": site_id,
                "installation_id": installation_id,
                "suggested_next_due_at": self._shift_months(reference_completed_at, 12),
                "last_executed_at": reference_completed_at,
                "source": "history_completed_this_year",
                "reference_work_order_id": getattr(reference_work_order, "id", None),
                "reference_completed_at": reference_completed_at,
            }

        installation_reference = self._get_installation_reference_date(
            tenant_db,
            installation_id=installation_id,
        )
        if installation_reference is not None:
            return {
                "client_id": client_id,
                "site_id": site_id,
                "installation_id": installation_id,
                "suggested_next_due_at": self._add_frequency(installation_reference, 6, "months"),
                "last_executed_at": None,
                "source": "installation_baseline",
                "reference_work_order_id": None,
                "reference_completed_at": installation_reference,
            }

        return {
            "client_id": client_id,
            "site_id": site_id,
            "installation_id": installation_id,
            "suggested_next_due_at": None,
            "last_executed_at": None,
            "source": "none",
            "reference_work_order_id": None,
            "reference_completed_at": None,
        }

    def get_schedule(self, tenant_db: Session, schedule_id: int) -> MaintenanceSchedule:
        item = self.schedule_repository.get_by_id(tenant_db, schedule_id)
        if item is None:
            raise ValueError("La programacion solicitada no existe")
        return item

    def update_schedule(
        self,
        tenant_db: Session,
        schedule_id: int,
        payload: MaintenanceScheduleUpdateRequest,
    ) -> MaintenanceSchedule:
        item = self.get_schedule(tenant_db, schedule_id)
        normalized = self._normalize_payload(payload)
        self._validate_payload(tenant_db, normalized, current_item=item)
        equivalent = self.schedule_repository.find_equivalent_active(
            tenant_db,
            client_id=normalized["client_id"],
            site_id=normalized["site_id"],
            installation_id=normalized["installation_id"],
            task_type_id=normalized["task_type_id"],
            frequency_value=normalized["frequency_value"],
            frequency_unit=normalized["frequency_unit"],
        )
        if equivalent is not None and equivalent.id != item.id:
            raise ValueError("Ya existe una programacion activa equivalente para este cliente")
        for field, value in normalized.items():
            setattr(item, field, value)
        return self.schedule_repository.save(tenant_db, item)

    def set_schedule_active(
        self,
        tenant_db: Session,
        schedule_id: int,
        *,
        is_active: bool,
    ) -> MaintenanceSchedule:
        item = self.get_schedule(tenant_db, schedule_id)
        item.is_active = is_active
        return self.schedule_repository.save(tenant_db, item)

    def advance_schedule_after_completion(
        self,
        tenant_db: Session,
        schedule_id: int,
        *,
        executed_at: datetime | None = None,
    ) -> MaintenanceSchedule:
        item = self.get_schedule(tenant_db, schedule_id)
        effective_executed_at = executed_at or datetime.now(timezone.utc)
        item.last_executed_at = effective_executed_at
        item.next_due_at = self._add_frequency(effective_executed_at, item.frequency_value, item.frequency_unit)
        return self.schedule_repository.save(tenant_db, item)

    def _normalize_payload(
        self,
        payload: MaintenanceScheduleCreateRequest | MaintenanceScheduleUpdateRequest,
    ) -> dict:
        return {
            "client_id": payload.client_id,
            "site_id": payload.site_id,
            "installation_id": payload.installation_id,
            "task_type_id": payload.task_type_id,
            "name": payload.name.strip(),
            "description": payload.description.strip() if payload.description and payload.description.strip() else None,
            "frequency_value": payload.frequency_value,
            "frequency_unit": payload.frequency_unit.strip().lower(),
            "lead_days": payload.lead_days,
            "start_mode": payload.start_mode.strip(),
            "base_date": payload.base_date,
            "last_executed_at": payload.last_executed_at,
            "next_due_at": payload.next_due_at,
            "default_priority": payload.default_priority.strip().lower(),
            "estimated_duration_minutes": payload.estimated_duration_minutes,
            "billing_mode": payload.billing_mode.strip().lower(),
            "is_active": payload.is_active,
            "auto_create_due_items": payload.auto_create_due_items,
            "notes": payload.notes.strip() if payload.notes and payload.notes.strip() else None,
        }

    def _validate_payload(
        self,
        tenant_db: Session,
        payload: dict,
        *,
        current_item: MaintenanceSchedule | None = None,
    ) -> None:
        if not payload["name"]:
            raise ValueError("El nombre de la programacion es obligatorio")
        if payload["frequency_value"] <= 0:
            raise ValueError("La frecuencia debe ser mayor a cero")
        if payload["frequency_unit"] not in VALID_FREQUENCY_UNITS:
            raise ValueError("La unidad de frecuencia no es valida")
        if payload["lead_days"] < 0:
            raise ValueError("Los dias de aviso no pueden ser negativos")
        if payload["billing_mode"] not in VALID_BILLING_MODES:
            raise ValueError("El modo de cobro no es valido")
        if payload["last_executed_at"] and payload["next_due_at"] <= payload["last_executed_at"]:
            raise ValueError("La proxima fecha debe ser posterior a la ultima mantencion")

        client_exists = (
            tenant_db.query(BusinessClient.id)
            .filter(BusinessClient.id == payload["client_id"])
            .first()
        )
        if client_exists is None:
            raise ValueError("El cliente seleccionado no existe")

        site = None
        if payload["site_id"] is not None:
            site = tenant_db.query(BusinessSite).filter(BusinessSite.id == payload["site_id"]).first()
            if site is None:
                raise ValueError("La direccion seleccionada no existe")
            if site.client_id != payload["client_id"]:
                raise ValueError("La direccion no pertenece al cliente seleccionado")

        if payload["installation_id"] is not None:
            installation = (
                tenant_db.query(MaintenanceInstallation)
                .filter(MaintenanceInstallation.id == payload["installation_id"])
                .first()
            )
            if installation is None:
                raise ValueError("La instalacion seleccionada no existe")
            if payload["site_id"] is None:
                raise ValueError("Debes indicar la direccion antes de asociar una instalacion")
            if installation.site_id != payload["site_id"]:
                raise ValueError("La instalacion no pertenece a la direccion seleccionada")

        if payload["task_type_id"] is not None:
            task_type_exists = (
                tenant_db.query(BusinessTaskType.id)
                .filter(BusinessTaskType.id == payload["task_type_id"])
                .first()
            )
            if task_type_exists is None:
                raise ValueError("El tipo de mantencion seleccionado no existe")

    def _get_latest_completed_work_order(
        self,
        tenant_db: Session,
        *,
        client_id: int,
        site_id: int | None,
        installation_id: int | None,
    ) -> MaintenanceWorkOrder | None:
        query = (
            tenant_db.query(MaintenanceWorkOrder)
            .filter(MaintenanceWorkOrder.client_id == client_id)
            .filter(MaintenanceWorkOrder.maintenance_status == "completed")
        )
        if site_id is not None:
            query = query.filter(MaintenanceWorkOrder.site_id == site_id)
        if installation_id is not None:
            query = query.filter(MaintenanceWorkOrder.installation_id == installation_id)
        return (
            query.order_by(
                MaintenanceWorkOrder.completed_at.desc().nullslast(),
                MaintenanceWorkOrder.scheduled_for.desc().nullslast(),
                MaintenanceWorkOrder.requested_at.desc(),
                MaintenanceWorkOrder.id.desc(),
            )
            .first()
        )

    def _get_work_order_reference_date(self, item: MaintenanceWorkOrder | None) -> datetime | None:
        if item is None:
            return None
        return item.completed_at or item.scheduled_for or item.requested_at

    def _get_installation_reference_date(
        self,
        tenant_db: Session,
        *,
        installation_id: int | None,
    ) -> datetime | None:
        if installation_id is None:
            return None
        installation = (
            tenant_db.query(MaintenanceInstallation)
            .filter(MaintenanceInstallation.id == installation_id)
            .first()
        )
        if installation is None:
            return None
        return installation.last_service_at or installation.installed_at

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
