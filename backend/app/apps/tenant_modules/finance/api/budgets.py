from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import OperationalError, ProgrammingError
from sqlalchemy.orm import Session

from app.apps.tenant_modules.finance.api.error_handling import (
    raise_finance_schema_http_error,
)
from app.apps.tenant_modules.finance.dependencies import (
    build_finance_requested_by,
    require_finance_manage,
    require_finance_read,
)
from app.apps.tenant_modules.finance.schemas import (
    FinanceBudgetCloneData,
    FinanceBudgetCloneRequest,
    FinanceBudgetCloneResponse,
    FinanceBudgetCreateRequest,
    FinanceBudgetFocusItemResponse,
    FinanceBudgetGuidedAdjustmentData,
    FinanceBudgetGuidedAdjustmentRequest,
    FinanceBudgetGuidedAdjustmentResponse,
    FinanceBudgetItemResponse,
    FinanceBudgetMutationResponse,
    FinanceBudgetTemplateApplyData,
    FinanceBudgetTemplateApplyRequest,
    FinanceBudgetTemplateApplyResponse,
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


def _build_budget_focus_item(row: dict) -> FinanceBudgetFocusItemResponse:
    budget = row["budget"]
    return FinanceBudgetFocusItemResponse(
        id=budget.id,
        category_id=budget.category_id,
        category_name=row["category_name"],
        category_type=row["category_type"],
        budget_status=row["budget_status"],
        recommended_action=row["recommended_action"],
        amount=budget.amount,
        actual_amount=row["actual_amount"],
        variance_amount=row["variance_amount"],
        utilization_ratio=row["utilization_ratio"],
        is_active=budget.is_active,
    )


@router.post("/clone", response_model=FinanceBudgetCloneResponse)
def clone_finance_budgets(
    payload: FinanceBudgetCloneRequest,
    current_user=Depends(require_finance_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> FinanceBudgetCloneResponse:
    try:
        result = budget_service.clone_budgets(tenant_db, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except (ProgrammingError, OperationalError) as exc:
        raise_finance_schema_http_error(exc)

    return FinanceBudgetCloneResponse(
        success=True,
        message="Presupuestos financieros clonados correctamente",
        requested_by=build_finance_requested_by(current_user),
        data=FinanceBudgetCloneData(**result),
    )


@router.post("/template-apply", response_model=FinanceBudgetTemplateApplyResponse)
def apply_finance_budget_template(
    payload: FinanceBudgetTemplateApplyRequest,
    current_user=Depends(require_finance_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> FinanceBudgetTemplateApplyResponse:
    try:
        result = budget_service.apply_template(tenant_db, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except (ProgrammingError, OperationalError) as exc:
        raise_finance_schema_http_error(exc)

    return FinanceBudgetTemplateApplyResponse(
        success=True,
        message="Plantilla presupuestaria aplicada correctamente",
        requested_by=build_finance_requested_by(current_user),
        data=FinanceBudgetTemplateApplyData(**result),
    )


@router.post("/{budget_id}/guided-adjustment", response_model=FinanceBudgetGuidedAdjustmentResponse)
def apply_finance_budget_guided_adjustment(
    budget_id: int,
    payload: FinanceBudgetGuidedAdjustmentRequest,
    current_user=Depends(require_finance_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> FinanceBudgetGuidedAdjustmentResponse:
    try:
        budget, adjustment_mode = budget_service.apply_guided_adjustment(
            tenant_db,
            budget_id,
            payload,
        )
        rows, _summary, _focus_items = budget_service.list_budgets(
            tenant_db,
            period_month=budget.period_month,
            include_inactive=True,
        )
        row = next(item for item in rows if item["budget"].id == budget.id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except (ProgrammingError, OperationalError) as exc:
        raise_finance_schema_http_error(exc)

    return FinanceBudgetGuidedAdjustmentResponse(
        success=True,
        message="Ajuste guiado aplicado correctamente",
        requested_by=build_finance_requested_by(current_user),
        data=FinanceBudgetGuidedAdjustmentData(
            adjustment_mode=adjustment_mode,
            budget=_build_budget_item(row),
        ),
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
    try:
        rows, summary, focus_items = budget_service.list_budgets(
            tenant_db,
            period_month=period_month,
            include_inactive=include_inactive,
            category_type=category_type,
            budget_status=budget_status,
        )
    except (ProgrammingError, OperationalError) as exc:
        raise_finance_schema_http_error(exc)
    return FinanceBudgetsResponse(
        success=True,
        message="Presupuestos financieros recuperados correctamente",
        requested_by=build_finance_requested_by(current_user),
        total=len(rows),
        summary=FinanceBudgetsSummaryData(**summary),
        focus_items=[_build_budget_focus_item(item) for item in focus_items],
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
        rows, _summary, _focus_items = budget_service.list_budgets(
            tenant_db,
            period_month=budget.period_month,
            include_inactive=True,
        )
        row = next(item for item in rows if item["budget"].id == budget.id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except (ProgrammingError, OperationalError) as exc:
        raise_finance_schema_http_error(exc)

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
        rows, _summary, _focus_items = budget_service.list_budgets(
            tenant_db,
            period_month=budget.period_month,
            include_inactive=True,
        )
        row = next(item for item in rows if item["budget"].id == budget.id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except (ProgrammingError, OperationalError) as exc:
        raise_finance_schema_http_error(exc)

    return FinanceBudgetMutationResponse(
        success=True,
        message="Presupuesto financiero actualizado correctamente",
        requested_by=build_finance_requested_by(current_user),
        data=_build_budget_item(row),
    )
