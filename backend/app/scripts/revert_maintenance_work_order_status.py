import argparse
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.apps.platform_control.services.tenant_service import TenantService
from app.apps.tenant_modules.core.services.tenant_connection_service import (
    TenantConnectionService,
)
from app.apps.tenant_modules.finance.models import FinanceTransaction
from app.apps.tenant_modules.finance.repositories.transaction_audit_repository import (
    FinanceTransactionAuditRepository,
)
from app.apps.tenant_modules.maintenance.models import (
    MaintenanceCostActual,
    MaintenanceDueItem,
    MaintenanceSchedule,
    MaintenanceStatusLog,
    MaintenanceWorkOrder,
)
from app.apps.tenant_modules.maintenance.repositories import MaintenanceStatusLogRepository
from app.common.db.control_database import ControlSessionLocal

FINAL_STATUSES = {"completed", "cancelled"}
ACTIVE_STATUSES = {"scheduled", "in_progress"}
ALL_STATUSES = FINAL_STATUSES | ACTIVE_STATUSES


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Reabre una mantención cerrada por error humano, devolviéndola al estado previo "
            "o a uno explícito. Corre en dry-run por defecto."
        )
    )
    parser.add_argument("--tenant-slug", required=True, help="Slug del tenant a intervenir.")
    selector = parser.add_mutually_exclusive_group(required=True)
    selector.add_argument("--work-order-id", type=int, help="ID exacto de la OT.")
    selector.add_argument(
        "--title",
        help="Título exacto de la OT. Si hay más de una coincidencia, el script aborta mostrando candidatos.",
    )
    parser.add_argument(
        "--target-status",
        choices=sorted(ALL_STATUSES),
        help="Estado destino explícito. Si se omite, el script intenta volver al estado previo según trazabilidad.",
    )
    parser.add_argument(
        "--reason",
        help="Motivo visible en trazabilidad para justificar la reversa.",
    )
    parser.add_argument(
        "--changed-by-user-id",
        type=int,
        help="ID del usuario operador que ejecuta la reversa manual.",
    )
    parser.add_argument(
        "--void-finance",
        action="store_true",
        help="Anula también los movimientos financieros ligados al cierre y limpia los links en costo real.",
    )
    parser.add_argument(
        "--clear-closure-notes",
        action="store_true",
        help="Limpia closure_notes al reabrir la OT.",
    )
    parser.add_argument(
        "--clear-cancellation-reason",
        action="store_true",
        help="Limpia cancellation_reason al reabrir la OT.",
    )
    parser.add_argument(
        "--clear-due-resolution-note",
        action="store_true",
        help="Limpia resolution_note del pendiente asociado cuando corresponda.",
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Aplica cambios reales. Si se omite, el script solo muestra el plan de reversa.",
    )
    return parser.parse_args()


def normalize_status(value: str | None) -> str | None:
    if value is None:
        return None
    normalized = value.strip().lower()
    return normalized or None


def get_reference_date(item: MaintenanceWorkOrder | None) -> datetime | None:
    if item is None:
        return None
    return item.completed_at or item.scheduled_for or item.requested_at


def shift_months(value: datetime, months: int) -> datetime:
    month_index = value.month - 1 + months
    year = value.year + month_index // 12
    month = month_index % 12 + 1
    if month == 2:
        if year % 400 == 0 or (year % 4 == 0 and year % 100 != 0):
            days_in_month = 29
        else:
            days_in_month = 28
    elif month in {4, 6, 9, 11}:
        days_in_month = 30
    else:
        days_in_month = 31
    day = min(value.day, days_in_month)
    return value.replace(year=year, month=month, day=day)


def add_frequency(value: datetime, frequency_value: int, frequency_unit: str) -> datetime:
    if frequency_unit == "days":
        return value + timedelta(days=frequency_value)
    if frequency_unit == "weeks":
        return value + timedelta(weeks=frequency_value)
    if frequency_unit == "months":
        return shift_months(value, frequency_value)
    if frequency_unit == "years":
        return shift_months(value, frequency_value * 12)
    raise ValueError(f"Unidad de frecuencia no soportada: {frequency_unit}")


def resolve_work_order(tenant_db: Session, args: argparse.Namespace) -> MaintenanceWorkOrder:
    if args.work_order_id is not None:
        item = (
            tenant_db.query(MaintenanceWorkOrder)
            .filter(MaintenanceWorkOrder.id == args.work_order_id)
            .first()
        )
        if item is None:
            raise ValueError(f"No existe la OT {args.work_order_id}")
        return item

    candidates = (
        tenant_db.query(MaintenanceWorkOrder)
        .filter(MaintenanceWorkOrder.title == args.title.strip())
        .order_by(MaintenanceWorkOrder.updated_at.desc(), MaintenanceWorkOrder.id.desc())
        .all()
    )
    if not candidates:
        raise ValueError(f"No existe una OT con título exacto: {args.title}")
    if len(candidates) > 1:
        print("Se encontraron múltiples OT con ese título. Usa --work-order-id para evitar ambigüedad:")
        for item in candidates:
            print(
                f"- id={item.id} status={item.maintenance_status} client={item.client_id} "
                f"site={item.site_id} installation={item.installation_id} updated_at={item.updated_at}"
            )
        raise ValueError("Título ambiguo")
    return candidates[0]


def resolve_target_status(
    work_order: MaintenanceWorkOrder,
    status_logs: list[MaintenanceStatusLog],
    explicit_target_status: str | None,
) -> str:
    if explicit_target_status:
        return explicit_target_status
    if not status_logs:
        raise ValueError("La OT no tiene trazabilidad de estados para inferir el estado previo")
    latest_log = status_logs[0]
    inferred = normalize_status(latest_log.from_status)
    if inferred is None:
        raise ValueError("La OT no tiene un estado previo trazado para revertir automáticamente")
    if inferred not in ALL_STATUSES:
        raise ValueError(f"El estado previo trazado no es soportado por este script: {inferred}")
    return inferred


def build_status_log_note(current_status: str, target_status: str, reason: str | None) -> str:
    base = f"Reversa manual por error humano: {current_status} -> {target_status}"
    normalized_reason = reason.strip() if reason and reason.strip() else None
    return base if normalized_reason is None else f"{base}. Motivo: {normalized_reason}"


def restore_schedule_state(
    tenant_db: Session,
    work_order: MaintenanceWorkOrder,
    schedule: MaintenanceSchedule,
    due_item: MaintenanceDueItem | None,
) -> dict:
    previous_completed = (
        tenant_db.query(MaintenanceWorkOrder)
        .filter(MaintenanceWorkOrder.schedule_id == schedule.id)
        .filter(MaintenanceWorkOrder.id != work_order.id)
        .filter(MaintenanceWorkOrder.maintenance_status == "completed")
        .order_by(
            MaintenanceWorkOrder.completed_at.desc().nullslast(),
            MaintenanceWorkOrder.scheduled_for.desc().nullslast(),
            MaintenanceWorkOrder.requested_at.desc(),
            MaintenanceWorkOrder.id.desc(),
        )
        .first()
    )

    previous_reference = get_reference_date(previous_completed)
    if previous_reference is not None:
        schedule.last_executed_at = previous_reference
        schedule.next_due_at = add_frequency(
            previous_reference,
            schedule.frequency_value,
            schedule.frequency_unit,
        )
        strategy = "previous_completed_work_order"
    else:
        schedule.last_executed_at = None
        schedule.next_due_at = (
            due_item.due_at
            if due_item is not None
            else work_order.scheduled_for
            or work_order.requested_at
        )
        strategy = "restore_due_cycle_reference"

    tenant_db.add(schedule)
    return {
        "strategy": strategy,
        "last_executed_at": schedule.last_executed_at,
        "next_due_at": schedule.next_due_at,
        "reference_work_order_id": None if previous_completed is None else previous_completed.id,
    }


def void_transaction_in_place(
    tenant_db: Session,
    transaction: FinanceTransaction,
    *,
    actor_user_id: int | None,
    reason: str,
    audit_repository: FinanceTransactionAuditRepository,
) -> str:
    if transaction.is_voided:
        return "already_voided"
    if transaction.source_type in {"loan_installment_payment", "loan_installment_reversal"}:
        raise ValueError(
            f"La transacción {transaction.id} proviene de préstamos y no puede anularse desde este script"
        )
    transaction.is_voided = True
    transaction.voided_at = datetime.now(timezone.utc)
    transaction.void_reason = reason
    transaction.voided_by_user_id = actor_user_id
    transaction.is_favorite = False
    transaction.favorite_flag = False
    transaction.is_reconciled = False
    transaction.reconciled_at = None
    transaction.updated_by_user_id = actor_user_id
    tenant_db.add(transaction)
    tenant_db.add(
        audit_repository.build_event(
            transaction_id=transaction.id,
            event_type="transaction.voided",
            actor_user_id=actor_user_id,
            summary="Transaccion financiera anulada por reversa manual de maintenance",
            payload={
                "reason": reason,
                "source_type": transaction.source_type,
                "source_id": transaction.source_id,
            },
        )
    )
    return "voided"


def print_plan(
    work_order: MaintenanceWorkOrder,
    target_status: str,
    status_logs: list[MaintenanceStatusLog],
    due_item: MaintenanceDueItem | None,
    schedule: MaintenanceSchedule | None,
    actual: MaintenanceCostActual | None,
    args: argparse.Namespace,
) -> None:
    latest_log = status_logs[0] if status_logs else None
    print("Plan de reversa de mantención")
    print("=" * 80)
    print(f"tenant_slug           : {args.tenant_slug}")
    print(f"work_order_id         : {work_order.id}")
    print(f"title                 : {work_order.title}")
    print(f"current_status        : {work_order.maintenance_status}")
    print(f"target_status         : {target_status}")
    print(f"scheduled_for         : {work_order.scheduled_for}")
    print(f"completed_at          : {work_order.completed_at}")
    print(f"cancelled_at          : {work_order.cancelled_at}")
    print(f"due_item_id           : {work_order.due_item_id}")
    print(f"schedule_id           : {work_order.schedule_id}")
    print(f"actual_cost_record    : {'yes' if actual else 'no'}")
    print(f"void_finance          : {'yes' if args.void_finance else 'no'}")
    print(f"apply                 : {'yes' if args.apply else 'no (dry-run)'}")
    if latest_log is not None:
        print(
            f"latest_status_log     : id={latest_log.id} {latest_log.from_status} -> {latest_log.to_status} "
            f"at {latest_log.changed_at}"
        )
    if due_item is not None:
        print(
            f"due_item_state        : id={due_item.id} due_status={due_item.due_status} "
            f"contact_status={due_item.contact_status} due_at={due_item.due_at}"
        )
    if schedule is not None:
        print(
            f"schedule_state        : id={schedule.id} last_executed_at={schedule.last_executed_at} "
            f"next_due_at={schedule.next_due_at}"
        )
    if actual is not None:
        print(
            f"finance_links         : income={actual.income_transaction_id} expense={actual.expense_transaction_id} "
            f"finance_synced_at={actual.finance_synced_at}"
        )
        if actual.finance_synced_at and not args.void_finance:
            print(
                "warning               : la OT tiene sincronización con finance. "
                "Si el cierre fue erróneo también a nivel financiero, vuelve a correr con --void-finance."
            )
    print("=" * 80)


def main() -> int:
    args = parse_args()
    control_db = ControlSessionLocal()
    tenant_db: Session | None = None

    try:
        connection_service = TenantConnectionService()
        tenant_service = TenantService()
        tenant = connection_service.get_tenant_by_slug(control_db, args.tenant_slug)
        if tenant is None:
            print(f"Tenant no encontrado: {args.tenant_slug}")
            return 1

        tenant_status_error = tenant_service.get_tenant_status_error(tenant)
        if tenant_status_error is not None:
            _, detail = tenant_status_error
            print(f"Tenant no operable: {detail}")
            return 1

        tenant_session_factory = connection_service.get_tenant_session(tenant)
        tenant_db = tenant_session_factory()

        work_order = resolve_work_order(tenant_db, args)
        status_logs = (
            tenant_db.query(MaintenanceStatusLog)
            .filter(MaintenanceStatusLog.work_order_id == work_order.id)
            .order_by(MaintenanceStatusLog.changed_at.desc(), MaintenanceStatusLog.id.desc())
            .all()
        )
        target_status = resolve_target_status(
            work_order,
            status_logs,
            normalize_status(args.target_status),
        )
        if target_status == work_order.maintenance_status:
            raise ValueError("La OT ya está en el estado solicitado")

        due_item = None
        if work_order.due_item_id is not None:
            due_item = (
                tenant_db.query(MaintenanceDueItem)
                .filter(MaintenanceDueItem.id == work_order.due_item_id)
                .first()
            )

        schedule = None
        if work_order.schedule_id is not None:
            schedule = (
                tenant_db.query(MaintenanceSchedule)
                .filter(MaintenanceSchedule.id == work_order.schedule_id)
                .first()
            )

        actual = (
            tenant_db.query(MaintenanceCostActual)
            .filter(MaintenanceCostActual.work_order_id == work_order.id)
            .first()
        )

        print_plan(work_order, target_status, status_logs, due_item, schedule, actual, args)
        if not args.apply:
            print("Dry-run completado. Repite con --apply para ejecutar la reversa.")
            return 0

        audit_repository = FinanceTransactionAuditRepository()
        status_log_repository = MaintenanceStatusLogRepository()
        status_log_note = build_status_log_note(
            work_order.maintenance_status,
            target_status,
            args.reason,
        )
        current_status = work_order.maintenance_status

        work_order.maintenance_status = target_status
        if target_status == "completed":
            work_order.completed_at = datetime.now(timezone.utc)
            work_order.cancelled_at = None
        elif target_status == "cancelled":
            work_order.cancelled_at = datetime.now(timezone.utc)
            work_order.completed_at = None
        else:
            work_order.completed_at = None
            work_order.cancelled_at = None
        if args.clear_closure_notes and target_status in ACTIVE_STATUSES:
            work_order.closure_notes = None
        if args.clear_cancellation_reason and target_status != "cancelled":
            work_order.cancellation_reason = None
        tenant_db.add(work_order)
        status_log_repository.create(
            tenant_db,
            work_order_id=work_order.id,
            from_status=current_status,
            to_status=target_status,
            note=status_log_note,
            changed_by_user_id=args.changed_by_user_id,
        )

        if due_item is not None:
            if target_status in ACTIVE_STATUSES:
                due_item.due_status = "scheduled"
            elif target_status == "completed":
                due_item.due_status = "completed"
            elif target_status == "cancelled":
                due_item.due_status = "cancelled"
            if args.clear_due_resolution_note and target_status in ACTIVE_STATUSES:
                due_item.resolution_note = None
            tenant_db.add(due_item)

        schedule_result = None
        if schedule is not None and current_status == "completed" and target_status != "completed":
            schedule_result = restore_schedule_state(tenant_db, work_order, schedule, due_item)

        if actual is not None and args.void_finance:
            void_reason = status_log_note
            if actual.income_transaction_id is not None:
                income_transaction = (
                    tenant_db.query(FinanceTransaction)
                    .filter(FinanceTransaction.id == actual.income_transaction_id)
                    .first()
                )
                if income_transaction is not None:
                    result = void_transaction_in_place(
                        tenant_db,
                        income_transaction,
                        actor_user_id=args.changed_by_user_id,
                        reason=void_reason,
                        audit_repository=audit_repository,
                    )
                    print(f"Finance income tx {income_transaction.id}: {result}")
                actual.income_transaction_id = None
            if actual.expense_transaction_id is not None:
                expense_transaction = (
                    tenant_db.query(FinanceTransaction)
                    .filter(FinanceTransaction.id == actual.expense_transaction_id)
                    .first()
                )
                if expense_transaction is not None:
                    result = void_transaction_in_place(
                        tenant_db,
                        expense_transaction,
                        actor_user_id=args.changed_by_user_id,
                        reason=void_reason,
                        audit_repository=audit_repository,
                    )
                    print(f"Finance expense tx {expense_transaction.id}: {result}")
                actual.expense_transaction_id = None
            actual.finance_synced_at = None
            actual.updated_by_user_id = args.changed_by_user_id
            tenant_db.add(actual)

        tenant_db.commit()
        tenant_db.refresh(work_order)
        print(
            f"OT {work_order.id} revertida correctamente: {current_status} -> {work_order.maintenance_status}"
        )
        if schedule_result is not None:
            print(
                "Schedule restaurado: "
                f"strategy={schedule_result['strategy']} "
                f"last_executed_at={schedule_result['last_executed_at']} "
                f"next_due_at={schedule_result['next_due_at']}"
            )
        return 0
    except ValueError as exc:
        if tenant_db is not None:
            tenant_db.rollback()
        print(f"Error: {exc}")
        return 1
    except Exception as exc:  # pragma: no cover - soporte operativo
        if tenant_db is not None:
            tenant_db.rollback()
        print(f"Fallo inesperado: {exc}")
        return 1
    finally:
        if tenant_db is not None:
            tenant_db.close()
        control_db.close()


if __name__ == "__main__":
    raise SystemExit(main())
