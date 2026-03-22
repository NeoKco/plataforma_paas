from dataclasses import dataclass
from datetime import datetime, timezone


@dataclass(frozen=True)
class NormalizedBillingProviderEvent:
    provider: str
    provider_event_id: str
    event_type: str
    tenant_slug: str | None = None
    provider_customer_id: str | None = None
    provider_subscription_id: str | None = None
    billing_status: str | None = None
    billing_status_reason: str | None = None
    billing_current_period_ends_at: datetime | None = None
    billing_grace_until: datetime | None = None
    raw_payload: dict | None = None


class BillingProviderAdapterService:
    STRIPE_SUBSCRIPTION_STATUS_MAP = {
        "trialing": "trialing",
        "active": "active",
        "past_due": "past_due",
        "canceled": "canceled",
        "paused": "suspended",
        "unpaid": "suspended",
        "incomplete_expired": "canceled",
    }

    def normalize_event(
        self,
        *,
        provider: str,
        payload: dict,
    ) -> NormalizedBillingProviderEvent:
        normalized_provider = provider.strip().lower()
        if normalized_provider != "stripe":
            raise ValueError("Unsupported billing provider")

        return self._normalize_stripe_event(payload)

    def _normalize_stripe_event(
        self,
        payload: dict,
    ) -> NormalizedBillingProviderEvent:
        event_id = (payload.get("id") or "").strip()
        event_type = (payload.get("type") or "").strip().lower()
        data_object = ((payload.get("data") or {}).get("object") or {})
        metadata = data_object.get("metadata") or {}
        tenant_slug = (metadata.get("tenant_slug") or "").strip()

        if not event_id:
            raise ValueError("Stripe event missing id")
        if not event_type:
            raise ValueError("Stripe event missing type")
        provider_subscription_id = data_object.get("subscription")
        if not provider_subscription_id and event_type.startswith("customer.subscription"):
            provider_subscription_id = data_object.get("id")
        provider_customer_id = data_object.get("customer")

        if not tenant_slug and not provider_subscription_id and not provider_customer_id:
            raise ValueError(
                "Stripe event missing tenant identity metadata or provider identifiers"
            )

        billing_status = None
        billing_current_period_ends_at = None

        if event_type in {
            "customer.subscription.created",
            "customer.subscription.updated",
            "customer.subscription.deleted",
            "customer.subscription.paused",
            "customer.subscription.resumed",
        }:
            stripe_status = (data_object.get("status") or "").strip().lower()
            billing_status = self.STRIPE_SUBSCRIPTION_STATUS_MAP.get(
                stripe_status,
                None if not stripe_status else "suspended",
            )
            if event_type == "customer.subscription.deleted":
                billing_status = "canceled"
            elif event_type == "customer.subscription.paused":
                billing_status = "suspended"
            elif event_type == "customer.subscription.resumed":
                billing_status = "active"
            billing_current_period_ends_at = self._from_unix(
                data_object.get("current_period_end")
            )
        elif event_type == "invoice.payment_failed":
            billing_status = "past_due"
            billing_current_period_ends_at = self._from_unix(
                data_object.get("period_end")
            )
        elif event_type == "invoice.payment_action_required":
            billing_status = "past_due"
            billing_current_period_ends_at = self._from_unix(
                data_object.get("period_end")
            )
        elif event_type == "invoice.marked_uncollectible":
            billing_status = "suspended"
            billing_current_period_ends_at = self._from_unix(
                data_object.get("period_end")
            )
        elif event_type == "invoice.paid":
            billing_status = "active"
            billing_current_period_ends_at = self._from_unix(
                data_object.get("period_end")
            )

        return NormalizedBillingProviderEvent(
            provider="stripe",
            provider_event_id=event_id,
            event_type=event_type,
            tenant_slug=tenant_slug or None,
            provider_customer_id=provider_customer_id,
            provider_subscription_id=provider_subscription_id,
            billing_status=billing_status,
            billing_status_reason=event_type,
            billing_current_period_ends_at=billing_current_period_ends_at,
            raw_payload=payload,
        )

    def _from_unix(self, value) -> datetime | None:
        if value in (None, ""):
            return None
        try:
            return datetime.fromtimestamp(int(value), tz=timezone.utc)
        except (TypeError, ValueError, OSError):
            return None
