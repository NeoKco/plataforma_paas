import os
from datetime import datetime
from types import SimpleNamespace


def set_test_environment() -> None:
    # Keep backend tests deterministic even when the parent shell exports
    # staging/production settings before Python imports the global settings object.
    os.environ["DEBUG"] = "true"
    os.environ["APP_ENV"] = "test"
    os.environ["PROVISIONING_DISPATCH_BACKEND"] = "database"
    os.environ["PROVISIONING_BROKER_URL"] = ""
    os.environ["REDIS_URL"] = ""
    os.environ["TENANT_API_RATE_LIMIT_BACKEND"] = "memory"
    os.environ["TENANT_API_RATE_LIMIT_REDIS_URL"] = ""
    os.environ["TENANT_PLAN_RATE_LIMITS"] = ""
    os.environ["TENANT_PLAN_ENABLED_MODULES"] = ""
    os.environ["TENANT_PLAN_MODULE_LIMITS"] = ""


def build_tenant_request(
    role: str = "admin",
    token_scope: str = "tenant",
    tenant_slug: str = "empresa-bootstrap",
    user_id: int = 1,
    email: str = "admin@empresa-bootstrap.local",
    maintenance_mode: bool = False,
):
    permissions_by_role = {
        "admin": [
            "tenant.users.read",
            "tenant.users.create",
            "tenant.users.update",
            "tenant.users.change_status",
            "tenant.users.delete",
            "tenant.finance.read",
            "tenant.finance.create",
            "tenant.finance.manage",
            "tenant.business_core.read",
            "tenant.business_core.manage",
            "tenant.products.read",
            "tenant.products.manage",
            "tenant.chat.read",
            "tenant.chat.manage",
            "tenant.crm.read",
            "tenant.crm.manage",
            "tenant.maintenance.read",
            "tenant.maintenance.manage",
            "tenant.taskops.read",
            "tenant.taskops.create_own",
            "tenant.taskops.assign_others",
            "tenant.taskops.manage",
            "tenant.techdocs.read",
            "tenant.techdocs.manage",
        ],
        "manager": [
            "tenant.users.read",
            "tenant.finance.read",
            "tenant.finance.create",
            "tenant.finance.manage",
            "tenant.business_core.read",
            "tenant.business_core.manage",
            "tenant.products.read",
            "tenant.products.manage",
            "tenant.chat.read",
            "tenant.chat.manage",
            "tenant.crm.read",
            "tenant.crm.manage",
            "tenant.maintenance.read",
            "tenant.maintenance.manage",
            "tenant.taskops.read",
            "tenant.taskops.create_own",
            "tenant.taskops.assign_others",
            "tenant.taskops.manage",
            "tenant.techdocs.read",
            "tenant.techdocs.manage",
        ],
        "operator": [
            "tenant.finance.read",
            "tenant.business_core.read",
            "tenant.products.read",
            "tenant.chat.read",
            "tenant.crm.read",
            "tenant.maintenance.read",
            "tenant.taskops.read",
            "tenant.taskops.create_own",
            "tenant.techdocs.read",
        ],
    }
    state = SimpleNamespace(
        tenant_slug=tenant_slug,
        tenant_user_id=user_id,
        tenant_email=email,
        tenant_role=role,
        token_scope=token_scope,
        tenant_maintenance_mode=maintenance_mode,
        tenant_effective_permissions=permissions_by_role.get(role, []),
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
                "tenant.finance.manage",
                "tenant.business_core.read",
                "tenant.business_core.manage",
                "tenant.products.read",
                "tenant.products.manage",
                "tenant.chat.read",
                "tenant.chat.manage",
                "tenant.crm.read",
                "tenant.crm.manage",
                "tenant.maintenance.read",
                "tenant.maintenance.manage",
                "tenant.taskops.read",
                "tenant.taskops.create_own",
                "tenant.taskops.assign_others",
                "tenant.taskops.manage",
                "tenant.techdocs.read",
                "tenant.techdocs.manage",
            ],
            "manager": [
                "tenant.users.read",
                "tenant.finance.read",
                "tenant.finance.create",
                "tenant.finance.manage",
                "tenant.business_core.read",
                "tenant.business_core.manage",
                "tenant.products.read",
                "tenant.products.manage",
                "tenant.chat.read",
                "tenant.chat.manage",
                "tenant.crm.read",
                "tenant.crm.manage",
                "tenant.maintenance.read",
                "tenant.maintenance.manage",
                "tenant.taskops.read",
                "tenant.taskops.create_own",
                "tenant.taskops.assign_others",
                "tenant.taskops.manage",
                "tenant.techdocs.read",
                "tenant.techdocs.manage",
            ],
            "operator": [
                "tenant.finance.read",
                "tenant.business_core.read",
                "tenant.products.read",
                "tenant.chat.read",
                "tenant.crm.read",
                "tenant.maintenance.read",
                "tenant.taskops.read",
                "tenant.taskops.create_own",
                "tenant.techdocs.read",
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
    timezone: str | None = None,
    is_active: bool = True,
):
    return SimpleNamespace(
        id=user_id,
        full_name=full_name,
        email=email,
        role=role,
        timezone=timezone,
        is_active=is_active,
    )


def build_subscription_item_stub(
    item_id: int = 1,
    module_key: str = "finance",
    item_kind: str = "addon",
    billing_cycle: str = "monthly",
    status: str = "active",
    starts_at: datetime | None = None,
    renews_at: datetime | None = None,
    ends_at: datetime | None = None,
    is_prorated: bool = False,
):
    return SimpleNamespace(
        id=item_id,
        module_key=module_key,
        item_kind=item_kind,
        billing_cycle=billing_cycle,
        status=status,
        starts_at=starts_at,
        renews_at=renews_at,
        ends_at=ends_at,
        is_prorated=is_prorated,
    )


def build_subscription_stub(
    subscription_id: int = 1,
    base_plan_code: str = "base_finance",
    status: str = "active",
    billing_cycle: str = "monthly",
    current_period_starts_at: datetime | None = None,
    current_period_ends_at: datetime | None = None,
    next_renewal_at: datetime | None = None,
    grace_until: datetime | None = None,
    is_co_termed: bool = True,
    items: list | None = None,
):
    return SimpleNamespace(
        id=subscription_id,
        base_plan_code=base_plan_code,
        status=status,
        billing_cycle=billing_cycle,
        current_period_starts_at=current_period_starts_at,
        current_period_ends_at=current_period_ends_at,
        next_renewal_at=next_renewal_at,
        grace_until=grace_until,
        is_co_termed=is_co_termed,
        items=items or [],
    )


def build_social_community_group_stub(
    group_id: int = 1,
    name: str = "Cerrillos",
    commune: str | None = "Cerrillos",
    sector: str | None = "Sector Centro",
    zone: str | None = "Zona Sur",
    territorial_classification: str | None = "comunidad",
    is_active: bool = True,
):
    return SimpleNamespace(
        id=group_id,
        name=name,
        commune=commune,
        sector=sector,
        zone=zone,
        territorial_classification=territorial_classification,
        is_active=is_active,
    )


def build_tenant_record_stub(
    tenant_name: str = "Empresa Bootstrap",
    tenant_slug: str = "empresa-bootstrap",
    tenant_type: str = "empresa",
    timezone: str = "America/Santiago",
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
    bootstrap_admin_full_name: str | None = "Tenant Admin",
    bootstrap_admin_email: str | None = "admin@empresa-bootstrap.local",
    bootstrap_admin_password_hash: str | None = "hashed-bootstrap-password",
    maintenance_finance_sync_mode: str = "auto_on_close",
    maintenance_finance_auto_sync_income: bool = True,
    maintenance_finance_auto_sync_expense: bool = True,
    maintenance_finance_income_account_id: int | None = None,
    maintenance_finance_expense_account_id: int | None = None,
    maintenance_finance_income_category_id: int | None = None,
    maintenance_finance_expense_category_id: int | None = None,
    maintenance_finance_currency_id: int | None = None,
    subscription=None,
):
    return SimpleNamespace(
        name=tenant_name,
        slug=tenant_slug,
        tenant_name=tenant_name,
        tenant_slug=tenant_slug,
        tenant_type=tenant_type,
        timezone=timezone,
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
        bootstrap_admin_full_name=bootstrap_admin_full_name,
        bootstrap_admin_email=bootstrap_admin_email,
        bootstrap_admin_password_hash=bootstrap_admin_password_hash,
        maintenance_finance_sync_mode=maintenance_finance_sync_mode,
        maintenance_finance_auto_sync_income=maintenance_finance_auto_sync_income,
        maintenance_finance_auto_sync_expense=maintenance_finance_auto_sync_expense,
        maintenance_finance_income_account_id=maintenance_finance_income_account_id,
        maintenance_finance_expense_account_id=maintenance_finance_expense_account_id,
        maintenance_finance_income_category_id=maintenance_finance_income_category_id,
        maintenance_finance_expense_category_id=maintenance_finance_expense_category_id,
        maintenance_finance_currency_id=maintenance_finance_currency_id,
        subscription=subscription,
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
