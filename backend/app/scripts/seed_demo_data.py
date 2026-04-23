import sys
from pathlib import Path
from sqlalchemy.orm import Session

BACKEND_DIR = Path(__file__).resolve().parents[2]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.apps.platform_control.models.tenant import Tenant
from app.apps.platform_control.repositories.tenant_repository import TenantRepository
from app.apps.platform_control.services.tenant_service import TenantService
from app.apps.tenant_modules.core.models.role import Role
from app.apps.tenant_modules.core.models.tenant_info import TenantInfo
from app.apps.tenant_modules.core.models.user import User
from app.apps.tenant_modules.core.services.tenant_connection_service import (
    TenantConnectionService,
)
from app.apps.tenant_modules.finance.models.entry import FinanceEntry
from app.common.policies.tenant_module_subscription_policy_service import (
    TenantModuleSubscriptionPolicyService,
)
from app.common.db.control_database import ControlSessionLocal
from app.common.security.password_service import hash_password
from app.seeds.control.demo_catalog import (
    DEMO_TENANT_USERS,
    build_demo_finance_entries,
    build_demo_tenant_specs,
)
from app.scripts.seed_platform_control import seed_installation, seed_superadmin


tenant_repository = TenantRepository()
tenant_connection_service = TenantConnectionService()
tenant_service = TenantService()
tenant_module_subscription_policy_service = TenantModuleSubscriptionPolicyService()


def _resolve_default_base_plan_code() -> str:
    default_entry = next(
        (
            entry
            for entry in tenant_module_subscription_policy_service.BASE_PLAN_CATALOG
            if entry.is_default
        ),
        None,
    )
    if default_entry is not None:
        return default_entry.plan_code
    return tenant_module_subscription_policy_service.DEFAULT_BASE_PLAN_CODE


def upsert_demo_tenants(db: Session) -> list[Tenant]:
    demo_tenants: list[Tenant] = []
    for spec in build_demo_tenant_specs(_resolve_default_base_plan_code()):
        base_plan_code = spec.pop("base_plan_code", None)
        subscription_billing_cycle = spec.pop(
            "subscription_billing_cycle",
            "monthly",
        )
        tenant = tenant_repository.get_by_slug(db, spec["slug"])
        if tenant is None:
            tenant = Tenant(
                name=spec["name"],
                slug=spec["slug"],
                tenant_type=spec["tenant_type"],
            )

        for field_name, value in spec.items():
            setattr(tenant, field_name, value)
        tenant.plan_code = None

        tenant = tenant_repository.save(db, tenant)
        if base_plan_code:
            tenant = tenant_service.set_subscription_contract(
                db,
                tenant.id,
                base_plan_code=base_plan_code,
                billing_cycle=subscription_billing_cycle,
                addon_items=[],
                retire_legacy_plan_code=True,
                attempt_module_seed_backfill=False,
            )
        demo_tenants.append(tenant)

    return demo_tenants


def seed_demo_tenant_database(tenant: Tenant) -> str:
    missing_config = [
        field_name
        for field_name in ("db_name", "db_user", "db_host", "db_port")
        if getattr(tenant, field_name, None) in (None, "")
    ]
    if missing_config:
        return f"skipped (missing DB config: {', '.join(missing_config)})"

    try:
        tenant_session_factory = tenant_connection_service.get_tenant_session(tenant)
        tenant_db = tenant_session_factory()
    except Exception as exc:  # pragma: no cover - integration safeguard
        return f"skipped (tenant DB unavailable: {exc})"

    try:
        _upsert_tenant_info(tenant_db, tenant)
        _upsert_roles(tenant_db)
        _upsert_demo_users(tenant_db, tenant.slug)
        _upsert_demo_finance_entries(tenant_db)
        tenant_db.commit()
        return "seeded"
    except Exception as exc:  # pragma: no cover - integration safeguard
        tenant_db.rollback()
        return f"failed ({exc})"
    finally:
        tenant_db.close()


def _upsert_tenant_info(db: Session, tenant: Tenant) -> None:
    tenant_info = db.query(TenantInfo).first()
    if tenant_info is None:
        db.add(
            TenantInfo(
                tenant_name=tenant.name,
                tenant_slug=tenant.slug,
                tenant_type=tenant.tenant_type,
            )
        )
        return

    tenant_info.tenant_name = tenant.name
    tenant_info.tenant_slug = tenant.slug
    tenant_info.tenant_type = tenant.tenant_type


def _upsert_roles(db: Session) -> None:
    role_names = {
        "admin": "Administrator",
        "manager": "Manager",
        "operator": "Operator",
    }
    for code, name in role_names.items():
        role = db.query(Role).filter(Role.code == code).first()
        if role is None:
            db.add(Role(code=code, name=name))
            continue
        role.name = name


def _upsert_demo_users(db: Session, tenant_slug: str) -> None:
    for spec in DEMO_TENANT_USERS:
        email = spec["email_template"].format(tenant_slug=tenant_slug)
        user = db.query(User).filter(User.email == email).first()
        if user is None:
            db.add(
                User(
                    full_name=spec["full_name"],
                    email=email,
                    password_hash=hash_password(spec["password"]),
                    role=spec["role"],
                    is_active=spec["is_active"],
                )
            )
            continue

        user.full_name = spec["full_name"]
        user.role = spec["role"]
        user.is_active = spec["is_active"]


def _upsert_demo_finance_entries(db: Session) -> None:
    for spec in build_demo_finance_entries():
        existing = (
            db.query(FinanceEntry)
            .filter(FinanceEntry.concept == spec["concept"])
            .filter(FinanceEntry.amount == spec["amount"])
            .filter(FinanceEntry.movement_type == spec["movement_type"])
            .first()
        )
        if existing is not None:
            continue
        db.add(FinanceEntry(**spec))


def main() -> None:
    db = ControlSessionLocal()
    try:
        seed_installation(db)
        seed_superadmin(db)
        demo_tenants = upsert_demo_tenants(db)
        print(f"Demo tenants upserted: {len(demo_tenants)}")
        for tenant in demo_tenants:
            db_status = seed_demo_tenant_database(tenant)
            print(
                f"- {tenant.slug}: status={tenant.status}, billing={tenant.billing_status}, "
                f"tenant_db={db_status}"
            )
    finally:
        db.close()


if __name__ == "__main__":
    main()
