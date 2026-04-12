from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.apps.tenant_modules.maintenance.dependencies import (
    build_maintenance_requested_by,
    require_maintenance_read,
)
from app.apps.tenant_modules.maintenance.schemas import (
    MaintenanceFinanceSyncDefaultsData,
    MaintenanceFinanceSyncDefaultsResponse,
)
from app.apps.tenant_modules.maintenance.services import MaintenanceCostingService
from app.common.db.session_manager import get_tenant_db

router = APIRouter(prefix="/tenant/maintenance", tags=["Tenant Maintenance"])
costing_service = MaintenanceCostingService()


@router.get("/finance-sync-defaults", response_model=MaintenanceFinanceSyncDefaultsResponse)
def get_maintenance_finance_sync_defaults(
    current_user=Depends(require_maintenance_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> MaintenanceFinanceSyncDefaultsResponse:
    data = costing_service.get_finance_sync_defaults(tenant_db)
    return MaintenanceFinanceSyncDefaultsResponse(
        success=True,
        message="Defaults maintenance-finance recuperados correctamente",
        requested_by=build_maintenance_requested_by(current_user),
        data=MaintenanceFinanceSyncDefaultsData(**data),
    )
