import json
from datetime import datetime

from sqlalchemy.orm import Session

from app.apps.platform_control.models.tenant import Tenant
from app.apps.platform_control.repositories.tenant_policy_change_event_repository import (
    TenantPolicyChangeEventRepository,
)


class TenantPolicyEventService:
    SNAPSHOT_FIELDS = (
        "status",
        "status_reason",
        "plan_code",
        "billing_provider",
        "billing_provider_customer_id",
        "billing_provider_subscription_id",
        "billing_status",
        "billing_status_reason",
        "billing_current_period_ends_at",
        "billing_grace_until",
        "maintenance_mode",
        "maintenance_starts_at",
        "maintenance_ends_at",
        "maintenance_reason",
        "maintenance_scopes",
        "maintenance_access_mode",
        "api_read_requests_per_minute",
        "api_write_requests_per_minute",
        "module_limits_json",
        "tenant_db_credentials_rotated_at",
    )

    def __init__(
        self,
        tenant_policy_change_event_repository: TenantPolicyChangeEventRepository | None = None,
    ) -> None:
        self.tenant_policy_change_event_repository = (
            tenant_policy_change_event_repository
            or TenantPolicyChangeEventRepository()
        )

    def build_snapshot(self, tenant: Tenant) -> dict:
        snapshot = {
            "tenant_id": tenant.id,
            "tenant_slug": tenant.slug,
        }
        for field in self.SNAPSHOT_FIELDS:
            value = getattr(tenant, field, None)
            if field == "plan_code" and self._is_subscription_contract_managed(
                getattr(tenant, "subscription", None)
            ):
                value = None
            snapshot[field] = self._normalize_value(value)
        return snapshot

    def record_change(
        self,
        db: Session,
        *,
        tenant: Tenant,
        event_type: str,
        previous_state: dict,
        new_state: dict,
        actor_context: dict | None = None,
    ):
        changed_fields = sorted(
            [
                field
                for field in self.SNAPSHOT_FIELDS
                if previous_state.get(field) != new_state.get(field)
            ]
        )
        return self.tenant_policy_change_event_repository.save(
            db,
            row={
                "tenant_id": tenant.id,
                "tenant_slug": tenant.slug,
                "event_type": event_type,
                "actor_user_id": self._safe_int(
                    None if actor_context is None else actor_context.get("sub")
                ),
                "actor_email": (
                    None if actor_context is None else actor_context.get("email")
                ),
                "actor_role": (
                    None if actor_context is None else actor_context.get("role")
                ),
                "previous_state_json": json.dumps(previous_state, sort_keys=True),
                "new_state_json": json.dumps(new_state, sort_keys=True),
                "changed_fields_json": json.dumps(changed_fields),
            },
        )

    def list_recent_history(
        self,
        db: Session,
        *,
        tenant_id: int,
        event_type: str | None = None,
        limit: int = 50,
    ) -> list[dict]:
        rows = self.tenant_policy_change_event_repository.list_recent(
            db,
            tenant_id=tenant_id,
            event_type=event_type,
            limit=limit,
        )
        return [self._serialize_event(row) for row in rows]

    def list_global_recent_history(
        self,
        db: Session,
        *,
        event_type: str | None = None,
        tenant_slug: str | None = None,
        actor_email: str | None = None,
        search: str | None = None,
        limit: int = 50,
    ) -> list[dict]:
        rows = self.tenant_policy_change_event_repository.list_global_recent(
            db,
            event_type=event_type,
            tenant_slug=tenant_slug,
            actor_email=actor_email,
            search=search,
            limit=limit,
        )
        return [self._serialize_event(row) for row in rows]

    def _serialize_event(self, row) -> dict:
        return {
            "id": row.id,
            "tenant_id": row.tenant_id,
            "tenant_slug": row.tenant_slug,
            "event_type": row.event_type,
            "actor_user_id": row.actor_user_id,
            "actor_email": row.actor_email,
            "actor_role": row.actor_role,
            "previous_state": json.loads(row.previous_state_json),
            "new_state": json.loads(row.new_state_json),
            "changed_fields": json.loads(row.changed_fields_json),
            "recorded_at": row.recorded_at,
        }

    def _normalize_value(self, value):
        if isinstance(value, str):
            try:
                return json.loads(value)
            except (TypeError, ValueError, json.JSONDecodeError):
                pass
        if isinstance(value, datetime):
            return value.isoformat()
        return value

    def _safe_int(self, value) -> int | None:
        if value is None:
            return None
        try:
            return int(value)
        except (TypeError, ValueError):
            return None

    def _is_subscription_contract_managed(self, subscription) -> bool:
        if subscription is None:
            return False
        return getattr(subscription, "current_period_starts_at", None) is not None
