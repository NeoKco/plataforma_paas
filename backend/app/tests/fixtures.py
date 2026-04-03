import os
from datetime import datetime
from types import SimpleNamespace


def set_test_environment() -> None:
    os.environ["DEBUG"] = "true"
    os.environ["APP_ENV"] = "test"


def build_tenant_request(
    role: str = "admin",
    token_scope: str = "tenant",
    tenant_slug: str = "empresa-bootstrap",
    user_id: int = 1,
    email: str = "admin@empresa-bootstrap.local",
    maintenance_mode: bool = False,
):
    state = SimpleNamespace(
        tenant_slug=tenant_slug,
        tenant_user_id=user_id,
        tenant_email=email,
        tenant_role=role,
        token_scope=token_scope,
        tenant_maintenance_mode=maintenance_mode,
    )
    return SimpleNamespace(state=state)


def build_tenant_context(
    role: str = "admin",
    tenant_slug: str = "empresa-bootstrap",
    user_id: int = 1,
    email: str = "admin@empresa-bootstrap.local",
    permissions: list[str] | None = None,
    maintenance_mode: bool = False,
) -> dict:
    if permissions is None:
        permissions_by_role = {
            "admin": [
                "tenant.users.read",
                "tenant.users.create",
                "tenant.users.update",
                "tenant.users.change_status",
                "tenant.users.delete",
                "tenant.finance.read",
                "tenant.finance.create",
                "tenant.business_core.read",
                "tenant.business_core.manage",
                "tenant.maintenance.read",
                "tenant.maintenance.manage",
            ],
            "manager": [
                "tenant.users.read",
                "tenant.finance.read",
                "tenant.finance.create",
                "tenant.business_core.read",
                "tenant.business_core.manage",
                "tenant.maintenance.read",
                "tenant.maintenance.manage",
            ],
            "operator": [
                "tenant.finance.read",
                "tenant.business_core.read",
                "tenant.maintenance.read",
            ],
        }
        permissions = permissions_by_role.get(role, [])

    return {
        "user_id": user_id,
        "email": email,
        "role": role,
        "tenant_slug": tenant_slug,
        "token_scope": "tenant",
        "maintenance_mode": maintenance_mode,
        "permissions": permissions,
    }


def build_tenant_user_stub(
    user_id: int = 1,
    full_name: str = "Tenant Admin",
    email: str = "admin@empresa-bootstrap.local",
    role: str = "admin",
    is_active: bool = True,
):
    return SimpleNamespace(
        id=user_id,
        full_name=full_name,
        email=email,
        role=role,
        is_active=is_active,
    )


def build_tenant_record_stub(
    tenant_name: str = "Empresa Bootstrap",
    tenant_slug: str = "empresa-bootstrap",
    tenant_type: str = "empresa",
    plan_code: str | None = None,
    billing_provider: str | None = None,
    billing_provider_customer_id: str | None = None,
    billing_provider_subscription_id: str | None = None,
    billing_status: str | None = None,
    billing_status_reason: str | None = None,
    billing_current_period_ends_at: datetime | None = None,
    billing_grace_until: datetime | None = None,
    maintenance_mode: bool = False,
    status: str = "active",
    status_reason: str | None = None,
    maintenance_starts_at: datetime | None = None,
    maintenance_ends_at: datetime | None = None,
    maintenance_reason: str | None = None,
    maintenance_scopes: str | None = None,
    maintenance_access_mode: str = "write_block",
    api_read_requests_per_minute: int | None = None,
    api_write_requests_per_minute: int | None = None,
    module_limits_json: str | None = None,
):
    return SimpleNamespace(
        name=tenant_name,
        slug=tenant_slug,
        tenant_name=tenant_name,
        tenant_slug=tenant_slug,
        tenant_type=tenant_type,
        plan_code=plan_code,
        billing_provider=billing_provider,
        billing_provider_customer_id=billing_provider_customer_id,
        billing_provider_subscription_id=billing_provider_subscription_id,
        billing_status=billing_status,
        billing_status_reason=billing_status_reason,
        billing_current_period_ends_at=billing_current_period_ends_at,
        billing_grace_until=billing_grace_until,
        maintenance_mode=maintenance_mode,
        status=status,
        status_reason=status_reason,
        maintenance_starts_at=maintenance_starts_at,
        maintenance_ends_at=maintenance_ends_at,
        maintenance_reason=maintenance_reason,
        maintenance_scopes=maintenance_scopes,
        maintenance_access_mode=maintenance_access_mode,
        api_read_requests_per_minute=api_read_requests_per_minute,
        api_write_requests_per_minute=api_write_requests_per_minute,
        module_limits_json=module_limits_json,
    )


def build_platform_request(
    role: str = "superadmin",
    token_scope: str = "platform",
    user_id: int = 1,
    email: str = "admin@platform.local",
):
    state = SimpleNamespace(
        platform_user_id=user_id,
        platform_email=email,
        platform_role=role,
        token_scope=token_scope,
        jwt_payload={
            "sub": str(user_id),
            "email": email,
            "role": role,
            "token_scope": token_scope,
        },
    )
    return SimpleNamespace(state=state)


def build_platform_context(
    role: str = "superadmin",
    user_id: int = 1,
    email: str = "admin@platform.local",
) -> dict:
    return {
        "sub": str(user_id),
        "email": email,
        "role": role,
        "token_scope": "platform",
    }


def build_platform_user_stub(
    user_id: int = 1,
    full_name: str = "Platform Admin",
    email: str = "admin@platform.local",
    role: str = "superadmin",
    is_active: bool = True,
    password_hash: str = "hashed",
):
    return SimpleNamespace(
        id=user_id,
        full_name=full_name,
        email=email,
        role=role,
        is_active=is_active,
        password_hash=password_hash,
    )


def build_finance_entry_stub(
    entry_id: int = 1,
    movement_type: str = "expense",
    concept: str = "Internet oficina",
    amount: float = 45.5,
    category: str = "services",
    created_by_user_id: int = 1,
):
    return SimpleNamespace(
        id=entry_id,
        movement_type=movement_type,
        concept=concept,
        amount=amount,
        category=category,
        created_by_user_id=created_by_user_id,
    )
