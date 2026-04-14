from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.apps.tenant_modules.maintenance.dependencies import (
    build_maintenance_requested_by,
    require_maintenance_manage,
    require_maintenance_read,
)
from app.apps.tenant_modules.maintenance.schemas import (
    MaintenanceCostActualItemResponse,
    MaintenanceCostActualWriteRequest,
    MaintenanceCostEstimateItemResponse,
    MaintenanceCostEstimateWriteRequest,
    MaintenanceFinanceTransactionSnapshotResponse,
    MaintenanceCostLineItemResponse,
    MaintenanceCostingDetailData,
    MaintenanceCostingDetailResponse,
    MaintenanceCostingMutationResponse,
    MaintenanceFinanceSyncRequest,
)
from app.apps.tenant_modules.maintenance.services import MaintenanceCostingService
from app.common.db.session_manager import get_tenant_db

router = APIRouter(prefix="/tenant/maintenance/work-orders", tags=["Tenant Maintenance"])
costing_service = MaintenanceCostingService()


def _build_estimate(item) -> MaintenanceCostEstimateItemResponse | None:
    if item is None:
        return None
    return MaintenanceCostEstimateItemResponse(
        id=item.id,
        work_order_id=item.work_order_id,
        labor_cost=item.labor_cost,
        travel_cost=item.travel_cost,
        materials_cost=item.materials_cost,
        external_services_cost=item.external_services_cost,
        overhead_cost=item.overhead_cost,
        total_estimated_cost=item.total_estimated_cost,
        target_margin_percent=item.target_margin_percent,
        suggested_price=item.suggested_price,
        notes=item.notes,
        created_by_user_id=item.created_by_user_id,
        updated_by_user_id=item.updated_by_user_id,
        created_at=item.created_at,
        updated_at=item.updated_at,
    )


def _build_finance_transaction_snapshot(item) -> MaintenanceFinanceTransactionSnapshotResponse | None:
    if item is None:
        return None
    return MaintenanceFinanceTransactionSnapshotResponse(
        transaction_id=item.id,
        account_id=item.account_id,
        category_id=item.category_id,
        currency_id=item.currency_id,
        transaction_at=item.transaction_at,
        description=item.description,
        notes=item.notes,
    )


def _build_actual(
    item,
    *,
    income_transaction_snapshot=None,
    expense_transaction_snapshot=None,
) -> MaintenanceCostActualItemResponse | None:
    if item is None:
        return None
    return MaintenanceCostActualItemResponse(
        id=item.id,
        work_order_id=item.work_order_id,
        labor_cost=item.labor_cost,
        travel_cost=item.travel_cost,
        materials_cost=item.materials_cost,
        external_services_cost=item.external_services_cost,
        overhead_cost=item.overhead_cost,
        total_actual_cost=item.total_actual_cost,
        actual_price_charged=item.actual_price_charged,
        actual_income=item.actual_income,
        actual_profit=item.actual_profit,
        actual_margin_percent=item.actual_margin_percent,
        applied_cost_template_id=getattr(item, "applied_cost_template_id", None),
        applied_cost_template_name_snapshot=getattr(item, "applied_cost_template_name_snapshot", None),
        notes=item.notes,
        income_transaction_id=item.income_transaction_id,
        expense_transaction_id=item.expense_transaction_id,
        finance_synced_at=item.finance_synced_at,
        income_transaction_snapshot=_build_finance_transaction_snapshot(income_transaction_snapshot),
        expense_transaction_snapshot=_build_finance_transaction_snapshot(expense_transaction_snapshot),
        created_by_user_id=item.created_by_user_id,
        updated_by_user_id=item.updated_by_user_id,
        created_at=item.created_at,
        updated_at=item.updated_at,
    )


def _build_line(item) -> MaintenanceCostLineItemResponse:
    return MaintenanceCostLineItemResponse(
        id=item.id,
        work_order_id=item.work_order_id,
        cost_stage=item.cost_stage,
        line_type=item.line_type,
        description=item.description,
        quantity=item.quantity,
        unit_cost=item.unit_cost,
        total_cost=item.total_cost,
        include_in_expense=getattr(item, "include_in_expense", True),
        finance_transaction_id=item.finance_transaction_id,
        notes=item.notes,
        created_by_user_id=item.created_by_user_id,
        updated_by_user_id=item.updated_by_user_id,
        created_at=item.created_at,
        updated_at=item.updated_at,
    )


def _build_data(detail: dict) -> MaintenanceCostingDetailData:
    return MaintenanceCostingDetailData(
        work_order_id=detail["work_order"].id,
        estimate=_build_estimate(detail.get("estimate")),
        estimate_lines=[_build_line(item) for item in detail.get("estimate_lines", [])],
        actual=_build_actual(
            detail.get("actual"),
            income_transaction_snapshot=detail.get("income_transaction_snapshot"),
            expense_transaction_snapshot=detail.get("expense_transaction_snapshot"),
        ),
        actual_lines=[_build_line(item) for item in detail.get("actual_lines", [])],
    )


@router.get("/{work_order_id}/costing", response_model=MaintenanceCostingDetailResponse)
def get_maintenance_work_order_costing(
    work_order_id: int,
    current_user=Depends(require_maintenance_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> MaintenanceCostingDetailResponse:
    try:
        detail = costing_service.get_costing_detail(tenant_db, work_order_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return MaintenanceCostingDetailResponse(
        success=True,
        message="Costeo recuperado correctamente",
        requested_by=build_maintenance_requested_by(current_user),
        data=_build_data(detail),
    )


@router.put("/{work_order_id}/cost-estimate", response_model=MaintenanceCostingMutationResponse)
def upsert_maintenance_work_order_cost_estimate(
    work_order_id: int,
    payload: MaintenanceCostEstimateWriteRequest,
    current_user=Depends(require_maintenance_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> MaintenanceCostingMutationResponse:
    try:
        detail = costing_service.upsert_cost_estimate(
            tenant_db,
            work_order_id,
            payload,
            actor_user_id=current_user["user_id"],
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return MaintenanceCostingMutationResponse(
        success=True,
        message="Costeo estimado actualizado correctamente",
        requested_by=build_maintenance_requested_by(current_user),
        data=_build_data(detail),
    )


@router.put("/{work_order_id}/cost-actual", response_model=MaintenanceCostingMutationResponse)
def upsert_maintenance_work_order_cost_actual(
    work_order_id: int,
    payload: MaintenanceCostActualWriteRequest,
    current_user=Depends(require_maintenance_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> MaintenanceCostingMutationResponse:
    try:
        detail = costing_service.upsert_cost_actual(
            tenant_db,
            work_order_id,
            payload,
            actor_user_id=current_user["user_id"],
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return MaintenanceCostingMutationResponse(
        success=True,
        message="Costeo real actualizado correctamente",
        requested_by=build_maintenance_requested_by(current_user),
        data=_build_data(detail),
    )


@router.post("/{work_order_id}/finance-sync", response_model=MaintenanceCostingMutationResponse)
def sync_maintenance_work_order_to_finance(
    work_order_id: int,
    payload: MaintenanceFinanceSyncRequest,
    current_user=Depends(require_maintenance_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> MaintenanceCostingMutationResponse:
    try:
        detail = costing_service.sync_to_finance(
            tenant_db,
            work_order_id,
            payload,
            actor_user_id=current_user["user_id"],
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return MaintenanceCostingMutationResponse(
        success=True,
        message="Sincronización con finance ejecutada correctamente",
        requested_by=build_maintenance_requested_by(current_user),
        data=_build_data(detail),
    )
