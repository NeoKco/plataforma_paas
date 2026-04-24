from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.apps.tenant_modules.techdocs.api.serializers import (
    build_dossier_item,
    build_evidence_item,
)
from app.apps.tenant_modules.techdocs.dependencies import (
    build_techdocs_requested_by,
    require_techdocs_read,
)
from app.apps.tenant_modules.techdocs.schemas import (
    TechDocsModuleOverviewResponse,
    TechDocsOverviewMetricsResponse,
)
from app.apps.tenant_modules.techdocs.services import TechDocsDossierService, TechDocsOverviewService
from app.common.db.session_manager import get_tenant_db

router = APIRouter(prefix="/tenant/techdocs/overview", tags=["Tenant TechDocs"])
overview_service = TechDocsOverviewService()
dossier_service = TechDocsDossierService()


@router.get("", response_model=TechDocsModuleOverviewResponse)
def get_techdocs_overview(
    current_user=Depends(require_techdocs_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> TechDocsModuleOverviewResponse:
    overview = overview_service.build_overview(tenant_db)
    dossier_maps = dossier_service.get_reference_maps(tenant_db, overview["recent_dossiers"])
    evidence_user_ids = [item.uploaded_by_user_id for item in overview["recent_evidences"] if item.uploaded_by_user_id]
    evidence_user_map = dossier_service.get_user_display_map(tenant_db, evidence_user_ids)
    return TechDocsModuleOverviewResponse(
        success=True,
        message="Resumen de expediente técnico recuperado correctamente",
        requested_by=build_techdocs_requested_by(current_user),
        metrics=TechDocsOverviewMetricsResponse(**overview["metrics"]),
        recent_dossiers=[build_dossier_item(item, maps=dossier_maps) for item in overview["recent_dossiers"]],
        recent_evidences=[
            build_evidence_item(item, user_display_map=evidence_user_map)
            for item in overview["recent_evidences"]
        ],
    )
