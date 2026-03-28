from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import OperationalError, ProgrammingError
from sqlalchemy.orm import Session

from app.apps.tenant_modules.finance.api.error_handling import (
    raise_finance_schema_http_error,
)
from app.apps.tenant_modules.finance.dependencies import (
    build_finance_requested_by,
    require_finance_read,
)
from app.apps.tenant_modules.finance.schemas import (
    FinanceReportOverviewData,
    FinanceReportOverviewResponse,
)
from app.apps.tenant_modules.finance.services import FinanceReportsService
from app.common.db.session_manager import get_tenant_db

router = APIRouter(prefix="/tenant/finance/reports", tags=["Tenant Finance"])
reports_service = FinanceReportsService()


@router.get("/overview", response_model=FinanceReportOverviewResponse)
def get_finance_reports_overview(
    period_month: date,
    trend_months: int = 6,
    movement_scope: str = "all",
    budget_category_scope: str = "all",
    budget_status_filter: str = "all",
    current_user=Depends(require_finance_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> FinanceReportOverviewResponse:
    try:
        overview = reports_service.get_overview(
            tenant_db,
            period_month=period_month,
            trend_months=trend_months,
            movement_scope=movement_scope,
            budget_category_scope=budget_category_scope,
            budget_status_filter=budget_status_filter,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except (ProgrammingError, OperationalError) as exc:
        raise_finance_schema_http_error(exc)
    return FinanceReportOverviewResponse(
        success=True,
        message="Reporte financiero recuperado correctamente",
        requested_by=build_finance_requested_by(current_user),
        data=FinanceReportOverviewData(**overview),
    )
