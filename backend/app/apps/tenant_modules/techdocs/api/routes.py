from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.apps.tenant_modules.techdocs.api.serializers import build_audit_event_item
from app.apps.tenant_modules.techdocs.dependencies import (
    build_techdocs_requested_by,
    require_techdocs_read,
)
from app.apps.tenant_modules.techdocs.schemas import TechDocsAuditResponse
from app.apps.tenant_modules.techdocs.services import TechDocsDossierService
from app.common.db.session_manager import get_tenant_db

router = APIRouter(prefix="/tenant/techdocs", tags=["Tenant TechDocs"])
service = TechDocsDossierService()


@router.get("/audit", response_model=TechDocsAuditResponse)
def list_techdocs_audit(
    dossier_id: int | None = None,
    q: str | None = None,
    current_user=Depends(require_techdocs_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> TechDocsAuditResponse:
    rows = service.list_audit_events(tenant_db, dossier_id=dossier_id, q=q)
    user_display_map = service.get_user_display_map(
        tenant_db,
        [item.created_by_user_id for item in rows if item.created_by_user_id],
    )
    return TechDocsAuditResponse(
        success=True,
        message="Auditoría de expediente técnico recuperada correctamente",
        requested_by=build_techdocs_requested_by(current_user),
        total=len(rows),
        data=[build_audit_event_item(item, user_display_map=user_display_map) for item in rows],
    )
