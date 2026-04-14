from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.apps.tenant_modules.maintenance.dependencies import (
    build_maintenance_requested_by,
    require_maintenance_read,
)
from app.apps.tenant_modules.maintenance.schemas import (
    MaintenanceHistoryFinanceSummaryResponse,
    MaintenanceHistoryResponse,
    MaintenanceHistoryWorkOrderItemResponse,
    MaintenanceStatusLogItemResponse,
    MaintenanceStatusLogsResponse,
    MaintenanceVisitItemResponse,
    MaintenanceVisitsResponse,
)
from app.apps.tenant_modules.maintenance.services import MaintenanceHistoryService
from app.common.db.session_manager import get_tenant_db

router = APIRouter(prefix="/tenant/maintenance", tags=["Tenant Maintenance"])
history_service = MaintenanceHistoryService()


def _build_status_log_item(item) -> MaintenanceStatusLogItemResponse:
    return MaintenanceStatusLogItemResponse(
        id=item.id,
        work_order_id=item.work_order_id,
        from_status=item.from_status,
        to_status=item.to_status,
        note=item.note,
        changed_by_user_id=item.changed_by_user_id,
        changed_at=item.changed_at,
    )


def _build_visit_item(item) -> MaintenanceVisitItemResponse:
    return MaintenanceVisitItemResponse(
        id=item.id,
        work_order_id=item.work_order_id,
        visit_type=getattr(item, "visit_type", "execution"),
        visit_status=item.visit_status,
        visit_result=getattr(item, "visit_result", None),
        scheduled_start_at=getattr(item, "scheduled_start_at", None),
        scheduled_end_at=getattr(item, "scheduled_end_at", None),
        actual_start_at=getattr(item, "actual_start_at", None),
        actual_end_at=getattr(item, "actual_end_at", None),
        assigned_work_group_id=getattr(item, "assigned_work_group_id", None),
        assigned_tenant_user_id=getattr(item, "assigned_tenant_user_id", None),
        assigned_group_label=getattr(item, "assigned_group_label", None),
        notes=getattr(item, "notes", None),
        created_at=item.created_at,
        updated_at=item.updated_at,
    )


def _build_history_item(entry: dict) -> MaintenanceHistoryWorkOrderItemResponse:
    item = entry["work_order"]
    finance_summary = entry.get("finance_summary") or {
        "has_actual_cost": False,
        "is_synced_to_finance": False,
        "income_transaction_id": None,
        "expense_transaction_id": None,
        "finance_synced_at": None,
    }
    return MaintenanceHistoryWorkOrderItemResponse(
        id=item.id,
        client_id=item.client_id,
        site_id=item.site_id,
        installation_id=item.installation_id,
        schedule_id=getattr(item, "schedule_id", None),
        due_item_id=getattr(item, "due_item_id", None),
        billing_mode=getattr(item, "billing_mode", None),
        external_reference=getattr(item, "external_reference", None),
        title=item.title,
        description=getattr(item, "description", None),
        priority=item.priority,
        cancellation_reason=getattr(item, "cancellation_reason", None),
        closure_notes=getattr(item, "closure_notes", None),
        assigned_work_group_id=getattr(item, "assigned_work_group_id", None),
        assigned_tenant_user_id=getattr(item, "assigned_tenant_user_id", None),
        maintenance_status=item.maintenance_status,
        requested_at=getattr(item, "requested_at", None),
        scheduled_for=getattr(item, "scheduled_for", None),
        completed_at=getattr(item, "completed_at", None),
        cancelled_at=getattr(item, "cancelled_at", None),
        created_by_user_id=getattr(item, "created_by_user_id", None),
        created_at=item.created_at,
        updated_at=item.updated_at,
        finance_summary=MaintenanceHistoryFinanceSummaryResponse(
            has_actual_cost=finance_summary["has_actual_cost"],
            is_synced_to_finance=finance_summary["is_synced_to_finance"],
            income_transaction_id=finance_summary["income_transaction_id"],
            expense_transaction_id=finance_summary["expense_transaction_id"],
            finance_synced_at=finance_summary["finance_synced_at"],
        ),
        status_logs=[_build_status_log_item(log) for log in entry["status_logs"]],
        visits=[_build_visit_item(visit) for visit in entry["visits"]],
    )


@router.get("/history", response_model=MaintenanceHistoryResponse)
def list_maintenance_history(
    client_id: int | None = None,
    site_id: int | None = None,
    current_user=Depends(require_maintenance_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> MaintenanceHistoryResponse:
    entries = history_service.list_history(
        tenant_db,
        client_id=client_id,
        site_id=site_id,
    )
    return MaintenanceHistoryResponse(
        success=True,
        message="Historial tecnico recuperado correctamente",
        requested_by=build_maintenance_requested_by(current_user),
        total=len(entries),
        data=[_build_history_item(entry) for entry in entries],
    )


@router.get("/work-orders/{work_order_id}/status-logs", response_model=MaintenanceStatusLogsResponse)
def list_maintenance_status_logs(
    work_order_id: int,
    current_user=Depends(require_maintenance_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> MaintenanceStatusLogsResponse:
    try:
        items = history_service.list_status_logs(tenant_db, work_order_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    return MaintenanceStatusLogsResponse(
        success=True,
        message="Trazabilidad recuperada correctamente",
        requested_by=build_maintenance_requested_by(current_user),
        total=len(items),
        data=[_build_status_log_item(item) for item in items],
    )


@router.get("/work-orders/{work_order_id}/visits", response_model=MaintenanceVisitsResponse)
def list_maintenance_visits(
    work_order_id: int,
    current_user=Depends(require_maintenance_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> MaintenanceVisitsResponse:
    try:
        items = history_service.list_visits(tenant_db, work_order_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    return MaintenanceVisitsResponse(
        success=True,
        message="Visitas recuperadas correctamente",
        requested_by=build_maintenance_requested_by(current_user),
        total=len(items),
        data=[_build_visit_item(item) for item in items],
    )
