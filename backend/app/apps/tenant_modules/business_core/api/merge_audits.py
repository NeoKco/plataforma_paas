import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.apps.tenant_modules.business_core.dependencies import (
    build_business_core_requested_by,
    require_business_core_manage,
    require_business_core_read,
)
from app.apps.tenant_modules.business_core.schemas import (
    BusinessCoreMergeAuditCreateRequest,
    BusinessCoreMergeAuditItemResponse,
    BusinessCoreMergeAuditMutationResponse,
    BusinessCoreMergeAuditsResponse,
)
from app.apps.tenant_modules.business_core.services import BusinessCoreMergeAuditService
from app.common.db.session_manager import get_tenant_db

router = APIRouter(prefix="/tenant/business-core/merge-audits", tags=["Tenant Business Core"])
merge_audit_service = BusinessCoreMergeAuditService()


def _build_merge_audit_item(audit) -> BusinessCoreMergeAuditItemResponse:
    try:
        payload = json.loads(audit.payload_json) if audit.payload_json else None
    except json.JSONDecodeError:
        payload = None
    return BusinessCoreMergeAuditItemResponse(
        id=audit.id,
        entity_kind=audit.entity_kind,
        entity_id=audit.entity_id,
        summary=audit.summary,
        payload=payload,
        requested_by_user_id=audit.requested_by_user_id,
        requested_by_email=audit.requested_by_email,
        requested_by_role=audit.requested_by_role,
        created_at=audit.created_at,
    )


@router.get("", response_model=BusinessCoreMergeAuditsResponse)
def list_business_core_merge_audits(
    entity_kind: str | None = None,
    entity_id: int | None = None,
    limit: int = 50,
    current_user=Depends(require_business_core_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> BusinessCoreMergeAuditsResponse:
    audits = merge_audit_service.list_recent_merge_audits(
        tenant_db,
        entity_kind=entity_kind,
        entity_id=entity_id,
        limit=max(1, min(limit, 200)),
    )
    return BusinessCoreMergeAuditsResponse(
        success=True,
        message="Auditorias de merge recuperadas correctamente",
        requested_by=build_business_core_requested_by(current_user),
        total=len(audits),
        data=[_build_merge_audit_item(audit) for audit in audits],
    )


@router.post("", response_model=BusinessCoreMergeAuditMutationResponse)
def create_business_core_merge_audit(
    payload: BusinessCoreMergeAuditCreateRequest,
    current_user=Depends(require_business_core_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> BusinessCoreMergeAuditMutationResponse:
    try:
        audit = merge_audit_service.record_merge_audit(
            tenant_db,
            payload,
            requested_by_user_id=current_user["user_id"],
            requested_by_email=current_user["email"],
            requested_by_role=current_user["role"],
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return BusinessCoreMergeAuditMutationResponse(
        success=True,
        message="Auditoria de merge registrada correctamente",
        requested_by=build_business_core_requested_by(current_user),
        data=_build_merge_audit_item(audit),
    )
