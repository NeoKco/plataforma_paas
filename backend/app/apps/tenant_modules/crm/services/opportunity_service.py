from sqlalchemy import func

from app.apps.tenant_modules.business_core.models import BusinessClient, BusinessOrganization
from app.apps.tenant_modules.crm.models import CRMOpportunity


class CRMOpportunityService:
    VALID_STAGES = {
        "lead",
        "qualified",
        "proposal",
        "negotiation",
        "won",
        "lost",
    }

    def list_opportunities(
        self,
        tenant_db,
        *,
        include_inactive: bool = True,
        stage: str | None = None,
        client_id: int | None = None,
        q: str | None = None,
    ) -> list[CRMOpportunity]:
        query = tenant_db.query(CRMOpportunity)
        if not include_inactive:
            query = query.filter(CRMOpportunity.is_active.is_(True))
        if stage:
            query = query.filter(CRMOpportunity.stage == stage.strip().lower())
        if client_id:
            query = query.filter(CRMOpportunity.client_id == client_id)
        if q and q.strip():
            token = f"%{q.strip().lower()}%"
            query = query.filter(func.lower(CRMOpportunity.title).like(token))
        return (
            query.order_by(
                CRMOpportunity.is_active.desc(),
                CRMOpportunity.sort_order.asc(),
                CRMOpportunity.expected_close_at.asc(),
                CRMOpportunity.created_at.desc(),
            ).all()
        )

    def get_opportunity(self, tenant_db, opportunity_id: int) -> CRMOpportunity:
        item = tenant_db.get(CRMOpportunity, opportunity_id)
        if item is None:
            raise ValueError("Oportunidad no encontrada")
        return item

    def create_opportunity(self, tenant_db, payload) -> CRMOpportunity:
        client_id = self._validate_client(tenant_db, payload.client_id)
        stage = self._validate_stage(payload.stage)
        item = CRMOpportunity(
            client_id=client_id,
            title=payload.title.strip(),
            stage=stage,
            owner_user_id=payload.owner_user_id,
            expected_value=None if payload.expected_value is None else max(float(payload.expected_value), 0),
            probability_percent=int(payload.probability_percent),
            expected_close_at=payload.expected_close_at,
            source_channel=self._normalize_optional(payload.source_channel),
            summary=self._normalize_optional(payload.summary),
            next_step=self._normalize_optional(payload.next_step),
            is_active=bool(payload.is_active),
            sort_order=int(payload.sort_order),
        )
        tenant_db.add(item)
        tenant_db.commit()
        tenant_db.refresh(item)
        return item

    def update_opportunity(self, tenant_db, opportunity_id: int, payload) -> CRMOpportunity:
        item = self.get_opportunity(tenant_db, opportunity_id)
        item.client_id = self._validate_client(tenant_db, payload.client_id)
        item.title = payload.title.strip()
        item.stage = self._validate_stage(payload.stage)
        item.owner_user_id = payload.owner_user_id
        item.expected_value = None if payload.expected_value is None else max(float(payload.expected_value), 0)
        item.probability_percent = int(payload.probability_percent)
        item.expected_close_at = payload.expected_close_at
        item.source_channel = self._normalize_optional(payload.source_channel)
        item.summary = self._normalize_optional(payload.summary)
        item.next_step = self._normalize_optional(payload.next_step)
        item.is_active = bool(payload.is_active)
        item.sort_order = int(payload.sort_order)
        tenant_db.add(item)
        tenant_db.commit()
        tenant_db.refresh(item)
        return item

    def set_opportunity_active(self, tenant_db, opportunity_id: int, is_active: bool) -> CRMOpportunity:
        item = self.get_opportunity(tenant_db, opportunity_id)
        item.is_active = bool(is_active)
        tenant_db.add(item)
        tenant_db.commit()
        tenant_db.refresh(item)
        return item

    def delete_opportunity(self, tenant_db, opportunity_id: int) -> CRMOpportunity:
        item = self.get_opportunity(tenant_db, opportunity_id)
        tenant_db.delete(item)
        tenant_db.commit()
        return item

    def get_client_display_map(self, tenant_db, client_ids: list[int]) -> dict[int, str]:
        normalized_ids = [item for item in client_ids if item]
        if not normalized_ids:
            return {}
        rows = (
            tenant_db.query(BusinessClient.id, BusinessOrganization.name)
            .join(BusinessOrganization, BusinessOrganization.id == BusinessClient.organization_id)
            .filter(BusinessClient.id.in_(normalized_ids))
            .all()
        )
        return {client_id: name for client_id, name in rows}

    def _validate_client(self, tenant_db, client_id: int | None) -> int | None:
        if client_id is None:
            return None
        client = tenant_db.get(BusinessClient, client_id)
        if client is None:
            raise ValueError("Cliente no encontrado")
        return client.id

    def _validate_stage(self, stage: str | None) -> str:
        normalized = (stage or "lead").strip().lower()
        if normalized not in self.VALID_STAGES:
            raise ValueError("Etapa de oportunidad invalida")
        return normalized

    @staticmethod
    def _normalize_optional(value: str | None) -> str | None:
        text = (value or "").strip()
        return text or None
