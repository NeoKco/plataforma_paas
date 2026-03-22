import json
from dataclasses import dataclass
from datetime import datetime

from sqlalchemy.orm import Session

from app.apps.platform_control.models.tenant_billing_sync_event import (
    TenantBillingSyncEvent,
)
from app.apps.platform_control.repositories.tenant_billing_sync_event_repository import (
    TenantBillingSyncEventRepository,
)
from app.apps.platform_control.services.tenant_policy_event_service import (
    TenantPolicyEventService,
)
from app.apps.platform_control.services.tenant_service import TenantService


@dataclass(frozen=True)
class BillingSyncEventResult:
    sync_event: TenantBillingSyncEvent
    tenant: object
    was_duplicate: bool = False
    was_reconciled: bool = False
    was_ignored: bool = False


class TenantBillingSyncService:
    def __init__(
        self,
        tenant_service: TenantService | None = None,
        tenant_policy_event_service: TenantPolicyEventService | None = None,
        tenant_billing_sync_event_repository: TenantBillingSyncEventRepository | None = None,
    ) -> None:
        self.tenant_service = tenant_service or TenantService()
        self.tenant_policy_event_service = (
            tenant_policy_event_service or TenantPolicyEventService()
        )
        self.tenant_billing_sync_event_repository = (
            tenant_billing_sync_event_repository
            or TenantBillingSyncEventRepository()
        )

    def apply_sync_event(
        self,
        db: Session,
        *,
        tenant_id: int,
        provider: str,
        provider_event_id: str,
        event_type: str,
        billing_status: str | None = None,
        billing_status_reason: str | None = None,
        billing_current_period_ends_at: datetime | None = None,
        billing_grace_until: datetime | None = None,
        provider_customer_id: str | None = None,
        provider_subscription_id: str | None = None,
        raw_payload: dict | None = None,
        actor_context: dict | None = None,
    ) -> BillingSyncEventResult:
        normalized_provider = provider.strip().lower()
        normalized_event_type = event_type.strip().lower()
        existing = self.tenant_billing_sync_event_repository.get_by_provider_event_id(
            db,
            provider=normalized_provider,
            provider_event_id=provider_event_id,
        )
        if existing is not None:
            tenant = self.tenant_service.tenant_repository.get_by_id(db, existing.tenant_id)
            if tenant is None:
                raise ValueError("Tenant not found")
            existing = self.tenant_billing_sync_event_repository.update_processing_result(
                db,
                event=existing,
                processing_result="duplicate",
            )
            return BillingSyncEventResult(
                sync_event=existing,
                tenant=tenant,
                was_duplicate=True,
            )

        previous_tenant = self.tenant_service.tenant_repository.get_by_id(db, tenant_id)
        if previous_tenant is None:
            raise ValueError("Tenant not found")
        previous_state = self.tenant_policy_event_service.build_snapshot(previous_tenant)

        if self._should_ignore_event(
            billing_status=billing_status,
            billing_status_reason=billing_status_reason,
            billing_current_period_ends_at=billing_current_period_ends_at,
            billing_grace_until=billing_grace_until,
        ):
            sync_event = self.tenant_billing_sync_event_repository.save(
                db,
                event=TenantBillingSyncEvent(
                    tenant_id=previous_tenant.id,
                    tenant_slug=previous_tenant.slug,
                    provider=normalized_provider,
                    provider_event_id=provider_event_id,
                    provider_customer_id=provider_customer_id,
                    provider_subscription_id=provider_subscription_id,
                    event_type=normalized_event_type,
                    billing_status=previous_tenant.billing_status,
                    billing_status_reason=previous_tenant.billing_status_reason,
                    billing_current_period_ends_at=previous_tenant.billing_current_period_ends_at,
                    billing_grace_until=previous_tenant.billing_grace_until,
                    raw_payload_json=(
                        None
                        if raw_payload is None
                        else json.dumps(raw_payload, sort_keys=True)
                    ),
                    processing_result="ignored",
                ),
            )
            return BillingSyncEventResult(
                sync_event=sync_event,
                tenant=previous_tenant,
                was_ignored=True,
            )

        tenant = self.tenant_service.set_billing_state(
            db=db,
            tenant_id=tenant_id,
            billing_status=billing_status,
            billing_status_reason=billing_status_reason,
            billing_current_period_ends_at=billing_current_period_ends_at,
            billing_grace_until=billing_grace_until,
        )
        tenant = self.tenant_service.set_billing_identity(
            db=db,
            tenant_id=tenant.id,
            billing_provider=normalized_provider,
            billing_provider_customer_id=provider_customer_id,
            billing_provider_subscription_id=provider_subscription_id,
            preserve_existing_missing=True,
        )

        sync_event = self.tenant_billing_sync_event_repository.save(
            db,
            event=TenantBillingSyncEvent(
                tenant_id=tenant.id,
                tenant_slug=tenant.slug,
                provider=normalized_provider,
                provider_event_id=provider_event_id,
                provider_customer_id=provider_customer_id,
                provider_subscription_id=provider_subscription_id,
                event_type=normalized_event_type,
                billing_status=tenant.billing_status,
                billing_status_reason=tenant.billing_status_reason,
                billing_current_period_ends_at=tenant.billing_current_period_ends_at,
                billing_grace_until=tenant.billing_grace_until,
                raw_payload_json=(
                    None if raw_payload is None else json.dumps(raw_payload, sort_keys=True)
                ),
                processing_result="applied",
            ),
        )

        self.tenant_policy_event_service.record_change(
            db,
            tenant=tenant,
            event_type="billing_sync",
            previous_state=previous_state,
            new_state=self.tenant_policy_event_service.build_snapshot(tenant),
            actor_context=actor_context,
        )

        return BillingSyncEventResult(
            sync_event=sync_event,
            tenant=tenant,
            was_duplicate=False,
        )

    def reconcile_from_stored_event(
        self,
        db: Session,
        *,
        tenant_id: int,
        sync_event_id: int,
        actor_context: dict | None = None,
    ) -> BillingSyncEventResult:
        sync_event = self.tenant_billing_sync_event_repository.get_by_id(
            db,
            event_id=sync_event_id,
        )
        if sync_event is None:
            raise ValueError("Billing sync event not found")
        if sync_event.tenant_id != tenant_id:
            raise ValueError("Billing sync event does not belong to tenant")

        previous_tenant = self.tenant_service.tenant_repository.get_by_id(db, tenant_id)
        if previous_tenant is None:
            raise ValueError("Tenant not found")
        previous_state = self.tenant_policy_event_service.build_snapshot(previous_tenant)

        tenant = self.tenant_service.set_billing_state(
            db=db,
            tenant_id=tenant_id,
            billing_status=sync_event.billing_status,
            billing_status_reason=sync_event.billing_status_reason,
            billing_current_period_ends_at=sync_event.billing_current_period_ends_at,
            billing_grace_until=sync_event.billing_grace_until,
        )
        tenant = self.tenant_service.set_billing_identity(
            db=db,
            tenant_id=tenant.id,
            billing_provider=sync_event.provider,
            billing_provider_customer_id=sync_event.provider_customer_id,
            billing_provider_subscription_id=sync_event.provider_subscription_id,
            preserve_existing_missing=True,
        )
        sync_event = self.tenant_billing_sync_event_repository.update_processing_result(
            db,
            event=sync_event,
            processing_result="reconciled",
        )

        self.tenant_policy_event_service.record_change(
            db,
            tenant=tenant,
            event_type="billing_reconcile",
            previous_state=previous_state,
            new_state=self.tenant_policy_event_service.build_snapshot(tenant),
            actor_context=actor_context,
        )

        return BillingSyncEventResult(
            sync_event=sync_event,
            tenant=tenant,
            was_duplicate=False,
            was_reconciled=True,
        )

    def list_recent_events(
        self,
        db: Session,
        *,
        tenant_id: int,
        provider: str | None = None,
        event_type: str | None = None,
        processing_result: str | None = None,
        limit: int = 50,
    ) -> list[dict]:
        rows = self.tenant_billing_sync_event_repository.list_recent(
            db,
            tenant_id=tenant_id,
            provider=provider.strip().lower() if provider else None,
            event_type=event_type.strip().lower() if event_type else None,
            processing_result=(
                processing_result.strip().lower() if processing_result else None
            ),
            limit=limit,
        )
        return [self._serialize_event(row) for row in rows]

    def reconcile_recent_events(
        self,
        db: Session,
        *,
        tenant_id: int,
        provider: str | None = None,
        event_type: str | None = None,
        processing_result: str | None = None,
        limit: int = 20,
        actor_context: dict | None = None,
    ) -> list[BillingSyncEventResult]:
        rows = self.tenant_billing_sync_event_repository.list_recent(
            db,
            tenant_id=tenant_id,
            provider=provider.strip().lower() if provider else None,
            event_type=event_type.strip().lower() if event_type else None,
            processing_result=(
                processing_result.strip().lower() if processing_result else None
            ),
            limit=limit,
        )

        results: list[BillingSyncEventResult] = []
        for row in rows:
            results.append(
                self.reconcile_from_stored_event(
                    db,
                    tenant_id=tenant_id,
                    sync_event_id=row.id,
                    actor_context=actor_context,
                )
            )
        return results

    def summarize_recent_events(
        self,
        db: Session,
        *,
        tenant_id: int,
        provider: str | None = None,
        event_type: str | None = None,
        processing_result: str | None = None,
    ) -> list[dict]:
        return self.tenant_billing_sync_event_repository.summarize_recent(
            db,
            tenant_id=tenant_id,
            provider=provider.strip().lower() if provider else None,
            event_type=event_type.strip().lower() if event_type else None,
            processing_result=(
                processing_result.strip().lower() if processing_result else None
            ),
        )

    def summarize_all_recent_events(
        self,
        db: Session,
        *,
        provider: str | None = None,
        event_type: str | None = None,
        processing_result: str | None = None,
    ) -> list[dict]:
        return self.tenant_billing_sync_event_repository.summarize_all_recent(
            db,
            provider=provider.strip().lower() if provider else None,
            event_type=event_type.strip().lower() if event_type else None,
            processing_result=(
                processing_result.strip().lower() if processing_result else None
            ),
        )

    def _serialize_event(self, row: TenantBillingSyncEvent) -> dict:
        return {
            "id": row.id,
            "tenant_id": row.tenant_id,
            "tenant_slug": row.tenant_slug,
            "provider": row.provider,
            "provider_event_id": row.provider_event_id,
            "provider_customer_id": row.provider_customer_id,
            "provider_subscription_id": row.provider_subscription_id,
            "event_type": row.event_type,
            "billing_status": row.billing_status,
            "billing_status_reason": row.billing_status_reason,
            "billing_current_period_ends_at": row.billing_current_period_ends_at,
            "billing_grace_until": row.billing_grace_until,
            "processing_result": row.processing_result,
            "recorded_at": row.recorded_at,
        }

    def _should_ignore_event(
        self,
        *,
        billing_status: str | None,
        billing_status_reason: str | None,
        billing_current_period_ends_at: datetime | None,
        billing_grace_until: datetime | None,
    ) -> bool:
        return (
            billing_status is None
            and billing_status_reason is None
            and billing_current_period_ends_at is None
            and billing_grace_until is None
        )
