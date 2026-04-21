from __future__ import annotations


ACCEPTED_LEGACY_FINANCE_BASE_CURRENCY_NOTE_PREFIX = (
    "accepted_legacy_finance_base_currency"
)


ACCEPTED_LEGACY_FINANCE_BASE_CURRENCY_POLICIES: dict[str, dict[str, str]] = {
    "empresa-bootstrap": {
        "currency_code": "USD",
        "policy_code": "accepted_legacy_coexistence",
        "reason": "baseline_e2e_tenant",
    },
}


def get_accepted_legacy_finance_currency_policy(
    tenant_slug: str | None,
    *,
    currency_code: str | None,
) -> dict[str, str] | None:
    if not tenant_slug:
        return None

    policy = ACCEPTED_LEGACY_FINANCE_BASE_CURRENCY_POLICIES.get(
        tenant_slug.strip().lower()
    )
    if policy is None:
        return None

    normalized_currency = (currency_code or "").strip().upper()
    expected_currency = str(policy["currency_code"]).strip().upper()
    if normalized_currency and normalized_currency != expected_currency:
        return None

    return {
        "tenant_slug": tenant_slug.strip().lower(),
        "currency_code": expected_currency,
        "policy_code": str(policy["policy_code"]).strip(),
        "reason": str(policy["reason"]).strip(),
    }
