from sqlalchemy.orm import Session

from app.apps.tenant_modules.business_core.models.merge_audit import BusinessCoreMergeAudit
from app.apps.tenant_modules.business_core.repositories.merge_audit_repository import (
    BusinessCoreMergeAuditRepository,
)
from app.apps.tenant_modules.business_core.schemas.merge_audit import (
    BusinessCoreMergeAuditCreateRequest,
)


class BusinessCoreMergeAuditService:
    def __init__(
        self,
        merge_audit_repository: BusinessCoreMergeAuditRepository | None = None,
    ) -> None:
        self.merge_audit_repository = merge_audit_repository or BusinessCoreMergeAuditRepository()

    def record_merge_audit(
        self,
        tenant_db: Session,
        payload: BusinessCoreMergeAuditCreateRequest,
        *,
        requested_by_user_id: int | None,
        requested_by_email: str | None,
        requested_by_role: str | None,
    ) -> BusinessCoreMergeAudit:
        summary = payload.summary.strip()
        if not summary:
            raise ValueError("El resumen del merge es obligatorio")

        entity_kind = payload.entity_kind.strip().lower()
        if not entity_kind:
            raise ValueError("El tipo de entidad del merge es obligatorio")

        return self.merge_audit_repository.save_event(
            tenant_db,
            entity_kind=entity_kind,
            entity_id=payload.entity_id,
            summary=summary,
            requested_by_user_id=requested_by_user_id,
            requested_by_email=requested_by_email,
            requested_by_role=requested_by_role,
            payload=payload.payload,
        )

    def list_recent_merge_audits(
        self,
        tenant_db: Session,
        *,
        entity_kind: str | None = None,
        entity_id: int | None = None,
        limit: int = 50,
    ) -> list[BusinessCoreMergeAudit]:
        return self.merge_audit_repository.list_recent_events(
            tenant_db,
            entity_kind=entity_kind,
            entity_id=entity_id,
            limit=limit,
        )
