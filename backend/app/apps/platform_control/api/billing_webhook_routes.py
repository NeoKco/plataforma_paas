import json

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from sqlalchemy.orm import Session

from app.apps.platform_control.schemas import (
    TenantBillingSyncApplyResponse,
    TenantBillingSyncEventResponse,
)
from app.apps.platform_control.services.billing_provider_adapter_service import (
    BillingProviderAdapterService,
)
from app.apps.platform_control.services.stripe_webhook_signature_service import (
    StripeWebhookSignatureService,
)
from app.apps.platform_control.services.tenant_billing_sync_service import (
    TenantBillingSyncService,
)
from app.apps.platform_control.services.tenant_policy_event_service import (
    TenantPolicyEventService,
)
from app.apps.platform_control.services.tenant_service import TenantService
from app.common.config.settings import settings
from app.common.db.session_manager import get_control_db

router = APIRouter(prefix="/webhooks/billing", tags=["billing-webhooks"])
tenant_service = TenantService()
tenant_policy_event_service = TenantPolicyEventService()
tenant_billing_sync_service = TenantBillingSyncService(
    tenant_service=tenant_service,
    tenant_policy_event_service=tenant_policy_event_service,
)
billing_provider_adapter_service = BillingProviderAdapterService()
stripe_webhook_signature_service = StripeWebhookSignatureService(
    tolerance_seconds=settings.BILLING_STRIPE_WEBHOOK_TOLERANCE_SECONDS,
)


@router.post("/stripe", response_model=TenantBillingSyncApplyResponse)
async def sync_stripe_billing_webhook(
    request: Request,
    db: Session = Depends(get_control_db),
    stripe_signature: str | None = Header(
        default=None,
        alias="Stripe-Signature",
    ),
) -> TenantBillingSyncApplyResponse:
    payload_bytes = await request.body()
    configured_secret = settings.BILLING_STRIPE_WEBHOOK_SECRET.strip()
    if configured_secret and not stripe_webhook_signature_service.validate_signature(
        payload=payload_bytes,
        signature_header=stripe_signature,
        secret=configured_secret,
    ):
        raise HTTPException(status_code=401, detail="Stripe webhook signature invalida")

    try:
        payload = json.loads(payload_bytes.decode("utf-8") or "{}")
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise HTTPException(status_code=400, detail="Stripe webhook payload invalido") from exc

    try:
        normalized_event = billing_provider_adapter_service.normalize_event(
            provider="stripe",
            payload=payload,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    tenant = tenant_service.resolve_tenant_for_billing_provider_event(
        db,
        provider=normalized_event.provider,
        tenant_slug=normalized_event.tenant_slug,
        provider_customer_id=normalized_event.provider_customer_id,
        provider_subscription_id=normalized_event.provider_subscription_id,
    )
    if tenant is None:
        raise HTTPException(status_code=404, detail="Tenant not found")

    result = tenant_billing_sync_service.apply_sync_event(
        db=db,
        tenant_id=tenant.id,
        provider=normalized_event.provider,
        provider_event_id=normalized_event.provider_event_id,
        event_type=normalized_event.event_type,
        billing_status=normalized_event.billing_status,
        billing_status_reason=normalized_event.billing_status_reason,
        billing_current_period_ends_at=normalized_event.billing_current_period_ends_at,
        billing_grace_until=normalized_event.billing_grace_until,
        provider_customer_id=normalized_event.provider_customer_id,
        provider_subscription_id=normalized_event.provider_subscription_id,
        raw_payload=normalized_event.raw_payload,
        actor_context={
            "sub": None,
            "email": "billing-webhook@system.local",
            "role": "system",
        },
    )

    sync_event = TenantBillingSyncEventResponse(
        **tenant_billing_sync_service._serialize_event(result.sync_event)
    )
    return TenantBillingSyncApplyResponse(
        success=True,
        message=(
            "Evento Stripe ignorado sin cambios operativos"
            if getattr(result, "was_ignored", False)
            else "Evento Stripe sincronizado sin cambios"
            if result.was_duplicate
            else "Evento Stripe sincronizado correctamente"
        ),
        tenant_id=result.tenant.id,
        tenant_slug=result.tenant.slug,
        tenant_status=result.tenant.status,
        billing_status=result.tenant.billing_status,
        billing_status_reason=result.tenant.billing_status_reason,
        billing_current_period_ends_at=result.tenant.billing_current_period_ends_at,
        billing_grace_until=result.tenant.billing_grace_until,
        was_duplicate=result.was_duplicate,
        sync_event=sync_event,
    )
