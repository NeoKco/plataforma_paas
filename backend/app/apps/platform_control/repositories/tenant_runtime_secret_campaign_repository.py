from sqlalchemy.orm import Session

from app.apps.platform_control.models.tenant_runtime_secret_campaign import (
    TenantRuntimeSecretCampaign,
)
from app.apps.platform_control.models.tenant_runtime_secret_campaign_item import (
    TenantRuntimeSecretCampaignItem,
)


class TenantRuntimeSecretCampaignRepository:
    def save_campaign(
        self,
        db: Session,
        *,
        row: dict,
        item_rows: list[dict],
    ) -> TenantRuntimeSecretCampaign:
        campaign = TenantRuntimeSecretCampaign(**row)
        db.add(campaign)
        db.flush()
        items = [
            TenantRuntimeSecretCampaignItem(campaign_id=campaign.id, **item_row)
            for item_row in item_rows
        ]
        if items:
            db.add_all(items)
        db.commit()
        db.refresh(campaign)
        return campaign

    def list_recent(
        self,
        db: Session,
        *,
        limit: int = 10,
    ) -> list[TenantRuntimeSecretCampaign]:
        return (
            db.query(TenantRuntimeSecretCampaign)
            .order_by(
                TenantRuntimeSecretCampaign.recorded_at.desc(),
                TenantRuntimeSecretCampaign.id.desc(),
            )
            .limit(limit)
            .all()
        )

    def list_items_for_campaign_ids(
        self,
        db: Session,
        *,
        campaign_ids: list[int],
    ) -> list[TenantRuntimeSecretCampaignItem]:
        if not campaign_ids:
            return []
        return (
            db.query(TenantRuntimeSecretCampaignItem)
            .filter(TenantRuntimeSecretCampaignItem.campaign_id.in_(campaign_ids))
            .order_by(
                TenantRuntimeSecretCampaignItem.campaign_id.desc(),
                TenantRuntimeSecretCampaignItem.id.asc(),
            )
            .all()
        )
