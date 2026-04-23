import json
from datetime import datetime

from sqlalchemy.orm import Session

from app.apps.platform_control.repositories.tenant_runtime_secret_campaign_repository import (
    TenantRuntimeSecretCampaignRepository,
)


class TenantRuntimeSecretCampaignService:
    def __init__(
        self,
        tenant_runtime_secret_campaign_repository: TenantRuntimeSecretCampaignRepository
        | None = None,
    ) -> None:
        self.tenant_runtime_secret_campaign_repository = (
            tenant_runtime_secret_campaign_repository
            or TenantRuntimeSecretCampaignRepository()
        )

    def record_campaign(
        self,
        db: Session,
        *,
        campaign_type: str,
        tenant_slugs: list[str] | None = None,
        excluded_tenant_slugs: list[str] | None = None,
        actor_context: dict | None = None,
        result: dict,
    ) -> dict:
        scope_mode = self._resolve_scope_mode(
            tenant_slugs=tenant_slugs,
            excluded_tenant_slugs=excluded_tenant_slugs,
        )
        row = {
            "campaign_type": campaign_type,
            "scope_mode": scope_mode,
            "tenant_slugs_json": self._json_or_none(tenant_slugs),
            "excluded_tenant_slugs_json": self._json_or_none(excluded_tenant_slugs),
            "processed": int(result.get("processed") or 0),
            "success_count": self._resolve_success_count(
                campaign_type=campaign_type,
                result=result,
            ),
            "already_runtime_managed": int(result.get("already_runtime_managed") or 0),
            "skipped_not_configured": int(result.get("skipped_not_configured") or 0),
            "skipped_legacy_rescue_required": int(
                result.get("skipped_legacy_rescue_required") or 0
            ),
            "failed": int(result.get("failed") or 0),
            "actor_user_id": self._safe_int(
                None if actor_context is None else actor_context.get("user_id")
            ),
            "actor_email": (
                None if actor_context is None else actor_context.get("email")
            ),
            "actor_role": None if actor_context is None else actor_context.get("role"),
        }
        item_rows = [self._normalize_item(item) for item in result.get("data", [])]
        campaign = self.tenant_runtime_secret_campaign_repository.save_campaign(
            db,
            row=row,
            item_rows=item_rows,
        )
        serialized = self._serialize_campaign(campaign)
        serialized["items"] = [
            self._serialize_item(item)
            for item in getattr(campaign, "items", [])
        ]
        return serialized

    def list_recent_campaigns(
        self,
        db: Session,
        *,
        limit: int = 10,
    ) -> list[dict]:
        campaigns = self.tenant_runtime_secret_campaign_repository.list_recent(
            db,
            limit=limit,
        )
        campaign_ids = [campaign.id for campaign in campaigns]
        items = self.tenant_runtime_secret_campaign_repository.list_items_for_campaign_ids(
            db,
            campaign_ids=campaign_ids,
        )
        items_by_campaign_id: dict[int, list[dict]] = {}
        for item in items:
            items_by_campaign_id.setdefault(item.campaign_id, []).append(
                self._serialize_item(item)
            )

        rows: list[dict] = []
        for campaign in campaigns:
            serialized = self._serialize_campaign(campaign)
            serialized["items"] = items_by_campaign_id.get(campaign.id, [])
            rows.append(serialized)
        return rows

    def _serialize_campaign(self, campaign) -> dict:
        return {
            "id": campaign.id,
            "campaign_type": campaign.campaign_type,
            "scope_mode": campaign.scope_mode,
            "tenant_slugs": self._load_json_array(campaign.tenant_slugs_json),
            "excluded_tenant_slugs": self._load_json_array(
                campaign.excluded_tenant_slugs_json
            ),
            "processed": campaign.processed,
            "success_count": campaign.success_count,
            "already_runtime_managed": campaign.already_runtime_managed,
            "skipped_not_configured": campaign.skipped_not_configured,
            "skipped_legacy_rescue_required": campaign.skipped_legacy_rescue_required,
            "failed": campaign.failed,
            "actor_user_id": campaign.actor_user_id,
            "actor_email": campaign.actor_email,
            "actor_role": campaign.actor_role,
            "recorded_at": campaign.recorded_at,
        }

    def _serialize_item(self, item) -> dict:
        return {
            "id": item.id,
            "tenant_id": item.tenant_id,
            "tenant_slug": item.tenant_slug,
            "outcome": item.outcome,
            "detail": item.detail,
            "source": item.source,
            "env_var_name": item.env_var_name,
            "managed_secret_path": item.managed_secret_path,
            "already_runtime_managed": item.already_runtime_managed,
            "rotated_at": item.rotated_at,
            "recorded_at": item.recorded_at,
        }

    def _normalize_item(self, item: dict) -> dict:
        return {
            "tenant_id": self._safe_int(item.get("tenant_id")),
            "tenant_slug": str(item.get("tenant_slug") or "").strip(),
            "outcome": str(item.get("outcome") or "").strip(),
            "detail": item.get("detail"),
            "source": item.get("source"),
            "env_var_name": item.get("env_var_name"),
            "managed_secret_path": item.get("managed_secret_path"),
            "already_runtime_managed": bool(item.get("already_runtime_managed") or False),
            "rotated_at": item.get("rotated_at"),
        }

    def _resolve_scope_mode(
        self,
        *,
        tenant_slugs: list[str] | None = None,
        excluded_tenant_slugs: list[str] | None = None,
    ) -> str:
        if tenant_slugs:
            return "include"
        if excluded_tenant_slugs:
            return "exclude"
        return "all"

    def _resolve_success_count(self, *, campaign_type: str, result: dict) -> int:
        if campaign_type == "sync_runtime_secret":
            return int(result.get("synced") or 0) + int(
                result.get("already_runtime_managed") or 0
            )
        if campaign_type == "rotate_db_credentials":
            return int(result.get("rotated") or 0)
        return 0

    def _json_or_none(self, value: list[str] | None) -> str | None:
        normalized = [
            str(item).strip()
            for item in (value or [])
            if str(item).strip()
        ]
        if not normalized:
            return None
        return json.dumps(normalized)

    def _load_json_array(self, value: str | None) -> list[str]:
        if not value:
            return []
        try:
            parsed = json.loads(value)
        except (TypeError, ValueError, json.JSONDecodeError):
            return []
        if not isinstance(parsed, list):
            return []
        return [str(item) for item in parsed if str(item).strip()]

    def _safe_int(self, value) -> int | None:
        if value is None:
            return None
        try:
            return int(value)
        except (TypeError, ValueError):
            return None
