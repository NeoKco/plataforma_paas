import sys
from pathlib import Path

from sqlalchemy.orm import Session

BACKEND_DIR = Path(__file__).resolve().parents[2]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.apps.platform_control.models.tenant import Tenant
from app.apps.platform_control.repositories.tenant_repository import TenantRepository
from app.apps.platform_control.services.provisioning_job_service import (
    ProvisioningJobService,
)
from app.apps.provisioning.services.provisioning_service import ProvisioningService
from app.common.config.settings import settings
from app.common.db.control_database import ControlSessionLocal
from app.common.policies.tenant_plan_policy_service import TenantPlanPolicyService
from app.scripts.seed_demo_data import seed_demo_tenant_database
from app.scripts.seed_platform_control import seed_installation, seed_superadmin


tenant_repository = TenantRepository()
provisioning_job_service = ProvisioningJobService()
provisioning_service = ProvisioningService()
tenant_plan_policy_service = TenantPlanPolicyService()


def _resolve_default_plan_code() -> str | None:
    plan_codes = set(tenant_plan_policy_service.parse_plan_rate_limits().keys())
    plan_codes.update(tenant_plan_policy_service.parse_plan_enabled_modules().keys())
    plan_codes.update(tenant_plan_policy_service.parse_plan_module_limits().keys())
    if not plan_codes:
        return None
    return sorted(plan_codes)[0]


def _upsert_tenant(
    db: Session,
    *,
    slug: str,
    name: str,
    tenant_type: str,
    status: str,
    status_reason: str | None,
    billing_status: str | None,
    billing_status_reason: str | None,
    plan_code: str | None,
) -> Tenant:
    tenant = tenant_repository.get_by_slug(db, slug)
    if tenant is None:
        tenant = Tenant(
            name=name,
            slug=slug,
            tenant_type=tenant_type,
        )

    tenant.name = name
    tenant.slug = slug
    tenant.tenant_type = tenant_type
    tenant.status = status
    tenant.status_reason = status_reason
    tenant.billing_status = billing_status
    tenant.billing_status_reason = billing_status_reason
    tenant.plan_code = plan_code
    tenant.maintenance_mode = False
    tenant.maintenance_starts_at = None
    tenant.maintenance_ends_at = None
    tenant.maintenance_reason = None
    tenant.maintenance_scopes = None
    tenant.maintenance_access_mode = "write_block"
    return tenant_repository.save(db, tenant)


def _mark_pending_without_db_config(db: Session, tenant: Tenant) -> Tenant:
    tenant.status = "pending"
    tenant.status_reason = "Pendiente de provisioning inicial"
    tenant.billing_status = None
    tenant.billing_status_reason = None
    tenant.db_name = None
    tenant.db_user = None
    tenant.db_host = None
    tenant.db_port = None
    return tenant_repository.save(db, tenant)


def _has_complete_db_config(tenant: Tenant) -> bool:
    return all(
        getattr(tenant, field_name, None) not in (None, "")
        for field_name in ("db_name", "db_user", "db_host", "db_port")
    )


def _ensure_provisioned(db: Session, tenant: Tenant) -> str:
    if _has_complete_db_config(tenant):
        tenant.status = "active"
        tenant.status_reason = None
        tenant_repository.save(db, tenant)
        tenant_db_status = seed_demo_tenant_database(tenant)
        return f"ready ({tenant_db_status})"

    if not settings.POSTGRES_ADMIN_PASSWORD:
        return "skipped (POSTGRES_ADMIN_PASSWORD missing)"

    job = provisioning_job_service.create_job(
        db=db,
        tenant_id=tenant.id,
        job_type="create_tenant_database",
    )
    provisioning_service.run_job(db, job.id)
    tenant_repository.refresh(db, tenant)
    tenant_db_status = seed_demo_tenant_database(tenant)
    return f"provisioned ({tenant_db_status})"


def main() -> None:
    db = ControlSessionLocal()
    try:
        seed_installation(db)
        seed_superadmin(db)

        default_plan_code = _resolve_default_plan_code()
        pending_tenant = _upsert_tenant(
            db,
            slug="empresa-demo",
            name="Empresa Demo",
            tenant_type="empresa",
            status="pending",
            status_reason="Pendiente de provisioning inicial",
            billing_status=None,
            billing_status_reason=None,
            plan_code=None,
        )
        pending_tenant = _mark_pending_without_db_config(db, pending_tenant)

        active_specs = [
            {
                "slug": "condominio-demo",
                "name": "Condominio Demo",
                "tenant_type": "condominio",
                "status": "active",
                "status_reason": None,
                "billing_status": "active",
                "billing_status_reason": "Tenant demo operativo",
                "plan_code": default_plan_code,
            },
            {
                "slug": "empresa-bootstrap",
                "name": "Empresa Bootstrap",
                "tenant_type": "empresa",
                "status": "active",
                "status_reason": None,
                "billing_status": "active",
                "billing_status_reason": "Tenant demo operativo",
                "plan_code": default_plan_code,
            },
        ]

        results: list[str] = []
        for spec in active_specs:
            tenant = _upsert_tenant(db, **spec)
            provision_status = _ensure_provisioned(db, tenant)
            results.append(
                f"- {tenant.slug}: status={tenant.status}, billing={tenant.billing_status}, "
                f"tenant_db={provision_status}"
            )

        print("Frontend demo baseline ready.")
        print(
            f"- {pending_tenant.slug}: status={pending_tenant.status}, "
            "tenant_db=pending without DB config"
        )
        for result in results:
            print(result)
        print("Platform login: admin@platform.local / AdminTemporal123!")
        print("Tenant login: admin@condominio-demo.local / TenantAdmin123!")
        print("Tenant login: admin@empresa-bootstrap.local / TenantAdmin123!")
    finally:
        db.close()


if __name__ == "__main__":
    main()
