from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.apps.tenant_modules.finance.dependencies import (
    build_finance_requested_by,
    require_finance_read,
)
from app.apps.tenant_modules.finance.schemas import (
    FinancePlanningOverviewData,
    FinancePlanningOverviewResponse,
)
from app.apps.tenant_modules.finance.services import FinancePlanningService
from app.common.db.session_manager import get_tenant_db

router = APIRouter(prefix="/tenant/finance/planning", tags=["Tenant Finance"])
planning_service = FinancePlanningService()


@router.get("/overview", response_model=FinancePlanningOverviewResponse)
def get_finance_planning_overview(
    period_month: date,
    current_user=Depends(require_finance_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> FinancePlanningOverviewResponse:
    overview = planning_service.get_monthly_overview(
        tenant_db,
        period_month=period_month,
    )
    return FinancePlanningOverviewResponse(
        success=True,
        message="Planificacion financiera recuperada correctamente",
        requested_by=build_finance_requested_by(current_user),
        data=FinancePlanningOverviewData(**overview),
    )
