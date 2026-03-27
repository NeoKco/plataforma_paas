from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.apps.tenant_modules.finance.dependencies import (
    build_finance_requested_by,
    require_finance_manage,
    require_finance_read,
)
from app.apps.tenant_modules.finance.schemas import (
    FinanceBudgetCreateRequest,
    FinanceBudgetItemResponse,
    FinanceBudgetMutationResponse,
    FinanceBudgetsResponse,
    FinanceBudgetsSummaryData,
    FinanceBudgetUpdateRequest,
)
from app.apps.tenant_modules.finance.services import FinanceBudgetService
from app.common.db.session_manager import get_tenant_db

router = APIRouter(prefix="/tenant/finance/budgets", tags=["Tenant Finance"])
budget_service = FinanceBudgetService()


def _build_budget_item(row: dict) -> FinanceBudgetItemResponse:
    budget = row["budget"]
    return FinanceBudgetItemResponse(
        id=budget.id,
        period_month=budget.period_month,
        category_id=budget.category_id,
        category_name=row["category_name"],
        category_type=row["category_type"],
        budget_status=row["budget_status"],
        amount=budget.amount,
        actual_amount=row["actual_amount"],
        variance_amount=row["variance_amount"],
        utilization_ratio=row["utilization_ratio"],
        note=budget.note,
        is_active=budget.is_active,
        created_at=budget.created_at,
        updated_at=budget.updated_at,
    )


@router.get("", response_model=FinanceBudgetsResponse)
def list_finance_budgets(
    period_month: date,
    include_inactive: bool = True,
    category_type: str | None = None,
    budget_status: str | None = None,
    current_user=Depends(require_finance_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> FinanceBudgetsResponse:
    rows, summary = budget_service.list_budgets(
        tenant_db,
        period_month=period_month,
        include_inactive=include_inactive,
        category_type=category_type,
        budget_status=budget_status,
    )
    return FinanceBudgetsResponse(
        success=True,
        message="Presupuestos financieros recuperados correctamente",
        requested_by=build_finance_requested_by(current_user),
        total=len(rows),
        summary=FinanceBudgetsSummaryData(**summary),
        data=[_build_budget_item(row) for row in rows],
    )


@router.post("", response_model=FinanceBudgetMutationResponse)
def create_finance_budget(
    payload: FinanceBudgetCreateRequest,
    current_user=Depends(require_finance_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> FinanceBudgetMutationResponse:
    try:
        budget = budget_service.create_budget(tenant_db, payload)
        rows, _summary = budget_service.list_budgets(
            tenant_db,
            period_month=budget.period_month,
            include_inactive=True,
        )
        row = next(item for item in rows if item["budget"].id == budget.id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return FinanceBudgetMutationResponse(
        success=True,
        message="Presupuesto financiero creado correctamente",
        requested_by=build_finance_requested_by(current_user),
        data=_build_budget_item(row),
    )


@router.put("/{budget_id}", response_model=FinanceBudgetMutationResponse)
def update_finance_budget(
    budget_id: int,
    payload: FinanceBudgetUpdateRequest,
    current_user=Depends(require_finance_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> FinanceBudgetMutationResponse:
    try:
        budget = budget_service.update_budget(tenant_db, budget_id, payload)
        rows, _summary = budget_service.list_budgets(
            tenant_db,
            period_month=budget.period_month,
            include_inactive=True,
        )
        row = next(item for item in rows if item["budget"].id == budget.id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return FinanceBudgetMutationResponse(
        success=True,
        message="Presupuesto financiero actualizado correctamente",
        requested_by=build_finance_requested_by(current_user),
        data=_build_budget_item(row),
    )
