from datetime import datetime, timezone
from dataclasses import dataclass
from email.utils import parseaddr
import json
from pathlib import Path
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.apps.installer.services.postgres_bootstrap_service import (
    PostgresBootstrapService,
)
from app.apps.platform_control.models.tenant import Tenant
from app.apps.platform_control.models.provisioning_job import ProvisioningJob
from app.apps.platform_control.models.tenant_billing_sync_event import (
    TenantBillingSyncEvent,
)
from app.apps.platform_control.models.tenant_retirement_archive import (
    TenantRetirementArchive,
)
from app.apps.platform_control.models.tenant_policy_change_event import (
    TenantPolicyChangeEvent,
)
from app.apps.platform_control.repositories.tenant_repository import TenantRepository
from app.apps.provisioning.services.tenant_schema_service import TenantSchemaService
from app.apps.provisioning.services.provisioning_dispatch_service import (
    ProvisioningDispatchService,
)
from app.apps.tenant_modules.core.services.tenant_connection_service import (
    TenantConnectionService,
)
from app.apps.platform_control.services.provisioning_job_service import (
    ProvisioningJobService,
)
from app.common.policies.tenant_billing_grace_policy_service import (
    TenantBillingGracePolicyService,
)
from app.common.policies.tenant_plan_policy_service import TenantPlanPolicyService
from app.common.config.settings import settings
from app.common.db.tenant_database import get_tenant_session_factory
from app.common.security.password_service import hash_password
from app.common.security.tenant_secret_service import TenantSecretService


@dataclass(frozen=True)
class TenantAccessPolicy:
    allowed: bool
    status_code: int | None = None
    detail: str | None = None
    blocking_source: str | None = None
    billing_in_grace: bool = False


class TenantService:
    VALID_STATUSES = {"pending", "active", "suspended", "error", "archived"}
    VALID_BILLING_STATUSES = {
        "trialing",
        "active",
        "past_due",
        "suspended",
        "canceled",
    }
    VALID_MAINTENANCE_SCOPES = {"all", "core", "users", "finance"}
    VALID_MAINTENANCE_ACCESS_MODES = {"write_block", "full_block"}

    def __init__(
        self,
        tenant_repository: TenantRepository | None = None,
        provisioning_job_service: ProvisioningJobService | None = None,
        provisioning_dispatch_service: ProvisioningDispatchService | None = None,
        tenant_connection_service: TenantConnectionService | None = None,
        tenant_schema_service: TenantSchemaService | None = None,
        tenant_plan_policy_service: TenantPlanPolicyService | None = None,
        tenant_billing_grace_policy_service: TenantBillingGracePolicyService | None = None,
        tenant_secret_service: TenantSecretService | None = None,
    ):
        self.tenant_repository = tenant_repository or TenantRepository()
        self.provisioning_job_service = (
            provisioning_job_service or ProvisioningJobService()
        )
        self.provisioning_dispatch_service = (
            provisioning_dispatch_service
            or ProvisioningDispatchService(
                provisioning_job_service=self.provisioning_job_service
            )
        )
        self.tenant_connection_service = (
            tenant_connection_service or TenantConnectionService()
        )
        self.tenant_schema_service = tenant_schema_service or TenantSchemaService()
        self.tenant_plan_policy_service = (
            tenant_plan_policy_service or TenantPlanPolicyService()
        )
        self.tenant_billing_grace_policy_service = (
            tenant_billing_grace_policy_service or TenantBillingGracePolicyService()
        )
        self.tenant_secret_service = tenant_secret_service or TenantSecretService()

    def create_tenant(
        self,
        db: Session,
        name: str,
        slug: str,
        tenant_type: str,
        admin_full_name: str,
        admin_email: str,
        admin_password: str,
        plan_code: str | None = None,
    ) -> Tenant:
        normalized_name = name.strip()
        normalized_slug = slug.strip().lower()
        normalized_tenant_type = tenant_type.strip().lower()
        normalized_admin_full_name = admin_full_name.strip()
        normalized_admin_email = admin_email.strip().lower()
        normalized_admin_password = admin_password.strip()

        existing = self.tenant_repository.get_by_slug(db, normalized_slug)
        if existing:
            raise ValueError("Tenant slug already exists")

        if not normalized_name:
            raise ValueError("Tenant name is required")
        if not normalized_slug:
            raise ValueError("Tenant slug is required")
        if not normalized_tenant_type:
            raise ValueError("Tenant type is required")
        if not normalized_admin_full_name:
            raise ValueError("Tenant admin full name is required")
        if not normalized_admin_email:
            raise ValueError("Tenant admin email is required")
        if not self._is_valid_email(normalized_admin_email):
            raise ValueError("Tenant admin email is invalid")
        if len(normalized_admin_password) < 10:
            raise ValueError("Tenant admin password must be at least 10 characters")

        normalized_plan_code = self._normalize_plan_code(plan_code)
        tenant = Tenant(
            name=normalized_name,
            slug=normalized_slug,
            tenant_type=normalized_tenant_type,
            plan_code=normalized_plan_code,
            bootstrap_admin_full_name=normalized_admin_full_name,
            bootstrap_admin_email=normalized_admin_email,
            bootstrap_admin_password_hash=hash_password(normalized_admin_password),
            status="pending",
        )

        tenant = self.tenant_repository.save(db, tenant)

        self.provisioning_dispatch_service.enqueue_job(
            db=db,
            tenant_id=tenant.id,
            job_type="create_tenant_database",
            status="pending",
        )

        return tenant

    def reprovision_tenant(self, db: Session, tenant_id: int) -> ProvisioningJob:
        tenant = self.tenant_repository.get_by_id(db, tenant_id)
        if not tenant:
            raise ValueError("Tenant not found")

        if tenant.status == "archived":
            raise ValueError("Archived tenants must be restored before reprovisioning")

        db_configured = bool(
            getattr(tenant, "db_name", None)
            and getattr(tenant, "db_user", None)
            and getattr(tenant, "db_host", None)
            and getattr(tenant, "db_port", None)
        )
        if db_configured:
            raise ValueError("Tenant database configuration is already complete")

        active_job = (
            db.query(ProvisioningJob)
            .filter(ProvisioningJob.tenant_id == tenant.id)
            .filter(ProvisioningJob.status.in_(["pending", "retry_pending", "running"]))
            .order_by(ProvisioningJob.id.desc())
            .first()
        )
        if active_job:
            raise ValueError("Tenant already has a live provisioning job")

        return self.provisioning_dispatch_service.enqueue_job(
            db=db,
            tenant_id=tenant.id,
            job_type="create_tenant_database",
            status="pending",
        )

    def request_deprovision_tenant(
        self,
        db: Session,
        tenant_id: int,
    ) -> ProvisioningJob:
        tenant = self.tenant_repository.get_by_id(db, tenant_id)
        if not tenant:
            raise ValueError("Tenant not found")

        if tenant.status != "archived":
            raise ValueError("Only archived tenants can be deprovisioned")

        db_configured = bool(
            getattr(tenant, "db_name", None)
            and getattr(tenant, "db_user", None)
            and getattr(tenant, "db_host", None)
            and getattr(tenant, "db_port", None)
        )
        if not db_configured:
            raise ValueError("Tenant database configuration is already empty")

        active_job = (
            db.query(ProvisioningJob)
            .filter(ProvisioningJob.tenant_id == tenant.id)
            .filter(ProvisioningJob.status.in_(["pending", "retry_pending", "running"]))
            .order_by(ProvisioningJob.id.desc())
            .first()
        )
        if active_job:
            raise ValueError("Tenant already has a live provisioning job")

        return self.provisioning_dispatch_service.enqueue_job(
            db=db,
            tenant_id=tenant.id,
            job_type="deprovision_tenant_database",
            status="pending",
        )

    def update_basic_identity(
        self,
        db: Session,
        tenant_id: int,
        name: str,
        tenant_type: str,
    ) -> Tenant:
        tenant = self.tenant_repository.get_by_id(db, tenant_id)
        if not tenant:
            raise ValueError("Tenant not found")

        normalized_name = name.strip()
        normalized_tenant_type = tenant_type.strip()

        if not normalized_name:
            raise ValueError("Tenant name is required")
        if not normalized_tenant_type:
            raise ValueError("Tenant type is required")

        tenant.name = normalized_name
        tenant.tenant_type = normalized_tenant_type
        return self.tenant_repository.save(db, tenant)

    def sync_tenant_schema(self, db: Session, tenant_id: int) -> Tenant:
        tenant = self.tenant_repository.get_by_id(db, tenant_id)
        if not tenant:
            raise ValueError("Tenant not found")

        if tenant.status != "active":
            raise ValueError("Tenant must be active to sync schema")

        credentials = self.tenant_connection_service.get_tenant_database_credentials(
            tenant
        )
        status = self.tenant_schema_service.sync_schema(**credentials)
        self._apply_schema_tracking(tenant, status)
        return self.tenant_repository.save(db, tenant)

    def request_tenant_schema_sync(self, db: Session, tenant_id: int) -> ProvisioningJob:
        tenant = self.tenant_repository.get_by_id(db, tenant_id)
        if not tenant:
            raise ValueError("Tenant not found")

        if tenant.status != "active":
            raise ValueError("Tenant must be active to sync schema")

        self.tenant_connection_service.get_tenant_database_credentials(tenant)

        active_job = (
            db.query(ProvisioningJob)
            .filter(ProvisioningJob.tenant_id == tenant.id)
            .filter(ProvisioningJob.status.in_(["pending", "retry_pending", "running"]))
            .order_by(ProvisioningJob.id.desc())
            .first()
        )
        if active_job:
            raise ValueError("Tenant already has a live provisioning job")

        return self.provisioning_dispatch_service.enqueue_job(
            db=db,
            tenant_id=tenant.id,
            job_type="sync_tenant_schema",
            status="pending",
        )

    def request_bulk_tenant_schema_sync(
        self,
        db: Session,
        *,
        limit: int = 100,
    ) -> dict:
        normalized_limit = max(min(limit, 500), 1)
        tenants = self.tenant_repository.list_all(db)
        live_job_tenant_ids = self._get_live_provisioning_tenant_ids(db)

        queued_items: list[dict] = []
        eligible_tenants = 0
        skipped_inactive = 0
        skipped_not_configured = 0
        skipped_live_jobs = 0
        skipped_invalid_credentials = 0

        for tenant in tenants:
            if tenant.status != "active":
                skipped_inactive += 1
                continue

            if not self._is_tenant_db_configured(tenant):
                skipped_not_configured += 1
                continue

            eligible_tenants += 1

            if tenant.id in live_job_tenant_ids:
                skipped_live_jobs += 1
                continue

            try:
                self.tenant_connection_service.get_tenant_database_credentials(tenant)
            except Exception:
                skipped_invalid_credentials += 1
                continue

            job = self.provisioning_dispatch_service.enqueue_job(
                db=db,
                tenant_id=tenant.id,
                job_type="sync_tenant_schema",
                status="pending",
            )
            queued_items.append(
                {
                    "tenant_id": tenant.id,
                    "tenant_slug": tenant.slug,
                    "job_id": job.id,
                    "job_type": job.job_type,
                    "status": job.status,
                }
            )
            live_job_tenant_ids.add(tenant.id)

            if len(queued_items) >= normalized_limit:
                break

        return {
            "limit": normalized_limit,
            "total_tenants": len(tenants),
            "eligible_tenants": eligible_tenants,
            "queued_jobs": len(queued_items),
            "skipped_inactive": skipped_inactive,
            "skipped_not_configured": skipped_not_configured,
            "skipped_live_jobs": skipped_live_jobs,
            "skipped_invalid_credentials": skipped_invalid_credentials,
            "data": queued_items,
        }

    def get_tenant_schema_status(self, db: Session, tenant_id: int) -> dict:
        tenant = self.tenant_repository.get_by_id(db, tenant_id)
        if not tenant:
            raise ValueError("Tenant not found")

        credentials = self.tenant_connection_service.get_tenant_database_credentials(
            tenant
        )
        status = self.tenant_schema_service.get_schema_status(**credentials)
        self._apply_schema_tracking(tenant, status)
        self.tenant_repository.save(db, tenant)
        return {
            "tenant": tenant,
            "latest_job": self._get_latest_schema_sync_job(db, tenant_id=tenant_id),
            **status,
        }

    def rotate_tenant_db_credentials(self, db: Session, tenant_id: int) -> dict:
        tenant = self.tenant_repository.get_by_id(db, tenant_id)
        if not tenant:
            raise ValueError("Tenant not found")

        if tenant.status == "archived":
            raise ValueError("Archived tenants cannot rotate technical credentials")

        credentials = self.tenant_connection_service.get_tenant_database_credentials(
            tenant
        )
        current_password = credentials["password"]
        new_password = self._generate_tenant_db_password()
        while new_password == current_password:
            new_password = self._generate_tenant_db_password()

        bootstrap = PostgresBootstrapService(
            admin_host=settings.CONTROL_DB_HOST,
            admin_port=settings.CONTROL_DB_PORT,
            admin_db_name="postgres",
            admin_user="postgres",
            admin_password=settings.POSTGRES_ADMIN_PASSWORD,
        )

        if not bootstrap.role_exists(tenant.db_user):
            raise ValueError("Tenant database role not found")
        if not bootstrap.database_exists(tenant.db_name):
            raise ValueError("Tenant database not found")

        bootstrap.create_role_if_not_exists(tenant.db_user, new_password)
        try:
            self._validate_tenant_db_connection(
                host=tenant.db_host,
                port=tenant.db_port,
                database=tenant.db_name,
                username=tenant.db_user,
                password=new_password,
            )
        except Exception as exc:
            bootstrap.create_role_if_not_exists(tenant.db_user, current_password)
            raise ValueError(
                "Rotated credentials failed validation and the previous password was restored"
            ) from exc

        runtime_env_path = Path(settings.TENANT_SECRETS_FILE)
        legacy_env_path = Path(settings.BASE_DIR) / ".env"
        env_var_name = self.tenant_secret_service.store_tenant_db_password(
            tenant_slug=tenant.slug,
            password=new_password,
            env_path=runtime_env_path,
        )
        self.tenant_secret_service.clear_tenant_bootstrap_db_password(
            tenant_slug=tenant.slug,
            env_path=runtime_env_path,
        )
        if legacy_env_path != runtime_env_path:
            self.tenant_secret_service.clear_tenant_bootstrap_db_password(
                tenant_slug=tenant.slug,
                env_path=legacy_env_path,
            )
        tenant.tenant_db_credentials_rotated_at = datetime.now(timezone.utc)
        tenant = self.tenant_repository.save(db, tenant)
        return {
            "tenant": tenant,
            "env_var_name": env_var_name,
            "rotated_at": tenant.tenant_db_credentials_rotated_at,
        }

    def deprovision_tenant(self, db: Session, tenant_id: int) -> dict:
        tenant = self.tenant_repository.get_by_id(db, tenant_id)
        if not tenant:
            raise ValueError("Tenant not found")

        if tenant.status != "archived":
            raise ValueError("Only archived tenants can be deprovisioned")

        has_db_config = bool(
            getattr(tenant, "db_name", None)
            or getattr(tenant, "db_user", None)
            or getattr(tenant, "db_host", None)
            or getattr(tenant, "db_port", None)
        )
        if not has_db_config:
            raise ValueError("Tenant database configuration is already empty")

        bootstrap = PostgresBootstrapService(
            admin_host=settings.CONTROL_DB_HOST,
            admin_port=settings.CONTROL_DB_PORT,
            admin_db_name="postgres",
            admin_user="postgres",
            admin_password=settings.POSTGRES_ADMIN_PASSWORD,
        )

        dropped_database = False
        dropped_role = False

        if tenant.db_name:
            try:
                bootstrap.drop_database_if_exists(tenant.db_name)
            except Exception as exc:
                setattr(exc, "_provisioning_stage", "deprovision_tenant_database")
                raise
            dropped_database = True
        if tenant.db_user:
            try:
                bootstrap.drop_role_if_exists(tenant.db_user)
            except Exception as exc:
                setattr(exc, "_provisioning_stage", "deprovision_tenant_role")
                raise
            dropped_role = True

        runtime_env_path = Path(settings.TENANT_SECRETS_FILE)
        legacy_env_path = Path(settings.BASE_DIR) / ".env"
        try:
            self.tenant_secret_service.clear_tenant_db_password(
                tenant_slug=tenant.slug,
                env_path=runtime_env_path,
            )
            self.tenant_secret_service.clear_tenant_bootstrap_db_password(
                tenant_slug=tenant.slug,
                env_path=runtime_env_path,
            )
            if legacy_env_path != runtime_env_path:
                self.tenant_secret_service.clear_tenant_db_password(
                    tenant_slug=tenant.slug,
                    env_path=legacy_env_path,
                )
                self.tenant_secret_service.clear_tenant_bootstrap_db_password(
                    tenant_slug=tenant.slug,
                    env_path=legacy_env_path,
                )
        except Exception as exc:
            setattr(exc, "_provisioning_stage", "deprovision_tenant_secret")
            raise

        tenant.db_name = None
        tenant.db_user = None
        tenant.db_host = None
        tenant.db_port = None
        tenant.tenant_schema_version = None
        tenant.tenant_schema_synced_at = None
        tenant.tenant_db_credentials_rotated_at = None
        tenant = self.tenant_repository.save(db, tenant)

        return {
            "tenant": tenant,
            "dropped_database": dropped_database,
            "dropped_role": dropped_role,
        }

    def set_maintenance_mode(
        self,
        db: Session,
        tenant_id: int,
        maintenance_mode: bool,
        maintenance_starts_at: datetime | None = None,
        maintenance_ends_at: datetime | None = None,
        maintenance_reason: str | None = None,
        maintenance_scopes: list[str] | None = None,
        maintenance_access_mode: str = "write_block",
    ) -> Tenant:
        tenant = self.tenant_repository.get_by_id(db, tenant_id)
        if not tenant:
            raise ValueError("Tenant not found")

        if (maintenance_starts_at is None) != (maintenance_ends_at is None):
            raise ValueError("Maintenance window requires both start and end")

        if (
            maintenance_starts_at is not None
            and maintenance_ends_at is not None
            and maintenance_ends_at <= maintenance_starts_at
        ):
            raise ValueError("Maintenance window end must be after start")

        if maintenance_access_mode not in self.VALID_MAINTENANCE_ACCESS_MODES:
            raise ValueError("Invalid maintenance access mode")

        normalized_scopes = self._normalize_maintenance_scopes(maintenance_scopes)

        tenant.maintenance_mode = maintenance_mode
        tenant.maintenance_starts_at = maintenance_starts_at
        tenant.maintenance_ends_at = maintenance_ends_at
        tenant.maintenance_reason = maintenance_reason.strip() if maintenance_reason else None
        tenant.maintenance_scopes = (
            ",".join(normalized_scopes) if normalized_scopes else None
        )
        tenant.maintenance_access_mode = maintenance_access_mode
        return self.tenant_repository.save(db, tenant)

    def set_api_rate_limits(
        self,
        db: Session,
        tenant_id: int,
        api_read_requests_per_minute: int | None = None,
        api_write_requests_per_minute: int | None = None,
    ) -> Tenant:
        tenant = self.tenant_repository.get_by_id(db, tenant_id)
        if not tenant:
            raise ValueError("Tenant not found")

        tenant.api_read_requests_per_minute = self._normalize_rate_limit_override(
            api_read_requests_per_minute,
            field_name="api_read_requests_per_minute",
        )
        tenant.api_write_requests_per_minute = self._normalize_rate_limit_override(
            api_write_requests_per_minute,
            field_name="api_write_requests_per_minute",
        )
        return self.tenant_repository.save(db, tenant)

    def set_module_limits(
        self,
        db: Session,
        tenant_id: int,
        *,
        module_limits: dict[str, int | None] | None = None,
    ) -> Tenant:
        tenant = self.tenant_repository.get_by_id(db, tenant_id)
        if not tenant:
            raise ValueError("Tenant not found")

        normalized_limits = self._normalize_module_limits_override(module_limits)
        tenant.module_limits_json = (
            None if normalized_limits is None else json.dumps(normalized_limits, sort_keys=True)
        )
        return self.tenant_repository.save(db, tenant)

    def set_status(
        self,
        db: Session,
        tenant_id: int,
        *,
        status: str,
        status_reason: str | None = None,
    ) -> Tenant:
        tenant = self.tenant_repository.get_by_id(db, tenant_id)
        if not tenant:
            raise ValueError("Tenant not found")

        normalized_status = status.strip().lower()
        if normalized_status not in self.VALID_STATUSES:
            raise ValueError("Invalid tenant status")

        tenant.status = normalized_status
        tenant.status_reason = status_reason.strip() if status_reason else None
        return self.tenant_repository.save(db, tenant)

    def restore_tenant(
        self,
        db: Session,
        tenant_id: int,
        *,
        target_status: str = "active",
        restore_reason: str | None = None,
    ) -> Tenant:
        tenant = self.tenant_repository.get_by_id(db, tenant_id)
        if not tenant:
            raise ValueError("Tenant not found")
        if tenant.status != "archived":
            raise ValueError("Only archived tenants can be restored")

        normalized_target_status = target_status.strip().lower()
        allowed_restore_statuses = {"pending", "active", "suspended"}
        if normalized_target_status not in allowed_restore_statuses:
            raise ValueError("Invalid tenant restore target status")

        tenant.status = normalized_target_status
        tenant.status_reason = (
            restore_reason.strip()
            if restore_reason
            else "Restaurado desde consola de plataforma"
        )
        return self.tenant_repository.save(db, tenant)

    def delete_tenant(
        self,
        db: Session,
        tenant_id: int,
        *,
        deleted_by_user_id: int | None = None,
        deleted_by_email: str | None = None,
    ) -> Tenant:
        tenant = self.tenant_repository.get_by_id(db, tenant_id)
        if not tenant:
            raise ValueError("Tenant not found")

        if tenant.status != "archived":
            raise ValueError("Only archived tenants can be deleted")

        if (
            getattr(tenant, "db_name", None)
            or getattr(tenant, "db_user", None)
            or getattr(tenant, "db_host", None)
            or getattr(tenant, "db_port", None)
        ):
            raise ValueError(
                "Only archived tenants without provisioned database configuration can be deleted"
            )

        billing_events = (
            db.query(TenantBillingSyncEvent)
            .filter(TenantBillingSyncEvent.tenant_id == tenant_id)
            .count()
        )
        policy_events = (
            db.query(TenantPolicyChangeEvent)
            .filter(TenantPolicyChangeEvent.tenant_id == tenant_id)
            .count()
        )
        provisioning_jobs = (
            db.query(ProvisioningJob)
            .filter(ProvisioningJob.tenant_id == tenant_id)
            .count()
        )

        db.add(
            self._build_tenant_retirement_archive(
                db,
                tenant,
                billing_events_count=billing_events,
                policy_events_count=policy_events,
                provisioning_jobs_count=provisioning_jobs,
                deleted_by_user_id=deleted_by_user_id,
                deleted_by_email=deleted_by_email,
            )
        )

        db.query(ProvisioningJob).filter(ProvisioningJob.tenant_id == tenant_id).delete(
            synchronize_session=False
        )
        db.query(TenantBillingSyncEvent).filter(
            TenantBillingSyncEvent.tenant_id == tenant_id
        ).delete(synchronize_session=False)
        db.query(TenantPolicyChangeEvent).filter(
            TenantPolicyChangeEvent.tenant_id == tenant_id
        ).delete(synchronize_session=False)
        self.tenant_repository.delete(db, tenant)
        return tenant

    def _build_tenant_retirement_archive(
        self,
        db: Session,
        tenant: Tenant,
        *,
        billing_events_count: int,
        policy_events_count: int,
        provisioning_jobs_count: int,
        deleted_by_user_id: int | None = None,
        deleted_by_email: str | None = None,
    ) -> TenantRetirementArchive:
        access_policy = self.get_tenant_access_policy(tenant)
        recent_billing_events = self._list_recent_billing_events(
            db,
            tenant_id=tenant.id,
            limit=10,
        )
        recent_policy_events = self._list_recent_policy_events(
            db,
            tenant_id=tenant.id,
            limit=10,
        )
        recent_provisioning_jobs = self._list_recent_provisioning_jobs(
            db,
            tenant_id=tenant.id,
            limit=10,
        )
        summary = {
            "tenant": {
                "id": tenant.id,
                "name": tenant.name,
                "slug": tenant.slug,
                "tenant_type": tenant.tenant_type,
                "plan_code": getattr(tenant, "plan_code", None),
                "status": tenant.status,
                "status_reason": getattr(tenant, "status_reason", None),
                "billing_provider": getattr(tenant, "billing_provider", None),
                "billing_provider_customer_id": getattr(
                    tenant, "billing_provider_customer_id", None
                ),
                "billing_provider_subscription_id": getattr(
                    tenant, "billing_provider_subscription_id", None
                ),
                "billing_status": getattr(tenant, "billing_status", None),
                "billing_status_reason": getattr(tenant, "billing_status_reason", None),
                "billing_current_period_ends_at": getattr(
                    tenant, "billing_current_period_ends_at", None
                ),
                "billing_grace_until": getattr(tenant, "billing_grace_until", None),
                "maintenance_mode": getattr(tenant, "maintenance_mode", False),
                "maintenance_reason": getattr(tenant, "maintenance_reason", None),
                "maintenance_scopes": getattr(tenant, "maintenance_scopes", None),
                "maintenance_access_mode": getattr(
                    tenant, "maintenance_access_mode", None
                ),
                "api_read_requests_per_minute": getattr(
                    tenant, "api_read_requests_per_minute", None
                ),
                "api_write_requests_per_minute": getattr(
                    tenant, "api_write_requests_per_minute", None
                ),
                "module_limits_json": getattr(tenant, "module_limits_json", None),
                "tenant_schema_version": getattr(tenant, "tenant_schema_version", None),
                "tenant_schema_synced_at": getattr(
                    tenant, "tenant_schema_synced_at", None
                ),
                "tenant_db_credentials_rotated_at": getattr(
                    tenant, "tenant_db_credentials_rotated_at", None
                ),
                "created_at": getattr(tenant, "created_at", None),
                "effective_module_limits": self.get_effective_module_limits(tenant),
                "effective_module_limit_sources": self.get_effective_module_limit_sources(
                    tenant
                ),
                "maintenance_scopes_effective": self.get_tenant_maintenance_scopes(tenant),
            },
            "access_policy": {
                "allowed": access_policy.allowed,
                "status_code": access_policy.status_code,
                "detail": access_policy.detail,
                "blocking_source": access_policy.blocking_source,
                "billing_in_grace": access_policy.billing_in_grace,
            },
            "retirement": {
                "billing_events_count": billing_events_count,
                "policy_events_count": policy_events_count,
                "provisioning_jobs_count": provisioning_jobs_count,
                "deleted_by_user_id": deleted_by_user_id,
                "deleted_by_email": deleted_by_email,
                "recent_billing_events": recent_billing_events,
                "recent_policy_events": recent_policy_events,
                "recent_provisioning_jobs": recent_provisioning_jobs,
            },
        }
        return TenantRetirementArchive(
            original_tenant_id=tenant.id,
            tenant_slug=tenant.slug,
            tenant_name=tenant.name,
            tenant_type=tenant.tenant_type,
            plan_code=getattr(tenant, "plan_code", None),
            tenant_status=tenant.status,
            tenant_status_reason=getattr(tenant, "status_reason", None),
            billing_provider=getattr(tenant, "billing_provider", None),
            billing_provider_customer_id=getattr(
                tenant, "billing_provider_customer_id", None
            ),
            billing_provider_subscription_id=getattr(
                tenant, "billing_provider_subscription_id", None
            ),
            billing_status=getattr(tenant, "billing_status", None),
            billing_status_reason=getattr(tenant, "billing_status_reason", None),
            billing_events_count=billing_events_count,
            policy_events_count=policy_events_count,
            provisioning_jobs_count=provisioning_jobs_count,
            deleted_by_user_id=deleted_by_user_id,
            deleted_by_email=deleted_by_email,
            tenant_created_at=getattr(tenant, "created_at", None),
            summary_json=json.dumps(summary, sort_keys=True, default=self._json_default),
        )

    def _list_recent_billing_events(
        self,
        db: Session,
        *,
        tenant_id: int,
        limit: int = 10,
    ) -> list[dict]:
        query = db.query(TenantBillingSyncEvent).filter(
            TenantBillingSyncEvent.tenant_id == tenant_id
        )
        rows = self._safe_query_recent_rows(
            query,
            order_by_attr="recorded_at",
            limit=limit,
        )
        return [
            {
                "id": row.id,
                "provider": row.provider,
                "event_type": row.event_type,
                "processing_result": row.processing_result,
                "billing_status": row.billing_status,
                "provider_customer_id": row.provider_customer_id,
                "provider_subscription_id": row.provider_subscription_id,
                "recorded_at": row.recorded_at,
            }
            for row in rows
        ]

    def _list_recent_policy_events(
        self,
        db: Session,
        *,
        tenant_id: int,
        limit: int = 10,
    ) -> list[dict]:
        query = db.query(TenantPolicyChangeEvent).filter(
            TenantPolicyChangeEvent.tenant_id == tenant_id
        )
        rows = self._safe_query_recent_rows(
            query,
            order_by_attr="recorded_at",
            limit=limit,
        )
        serialized: list[dict] = []
        for row in rows:
            try:
                changed_fields = json.loads(row.changed_fields_json)
            except (TypeError, ValueError, json.JSONDecodeError):
                changed_fields = []
            serialized.append(
                {
                    "id": row.id,
                    "event_type": row.event_type,
                    "actor_email": row.actor_email,
                    "actor_role": row.actor_role,
                    "changed_fields": changed_fields,
                    "recorded_at": row.recorded_at,
                }
            )
        return serialized

    def _list_recent_provisioning_jobs(
        self,
        db: Session,
        *,
        tenant_id: int,
        limit: int = 10,
    ) -> list[dict]:
        query = db.query(ProvisioningJob).filter(ProvisioningJob.tenant_id == tenant_id)
        rows = self._safe_query_recent_rows(
            query,
            order_by_attr="created_at",
            limit=limit,
        )
        return [
            {
                "id": row.id,
                "job_type": row.job_type,
                "status": row.status,
                "attempts": row.attempts,
                "max_attempts": row.max_attempts,
                "error_code": row.error_code,
                "created_at": row.created_at,
                "last_attempt_at": row.last_attempt_at,
            }
            for row in rows
        ]

    def _get_latest_schema_sync_job(
        self,
        db: Session,
        *,
        tenant_id: int,
    ) -> ProvisioningJob | None:
        if not hasattr(db, "query"):
            return None
        try:
            return (
                db.query(ProvisioningJob)
                .filter(ProvisioningJob.tenant_id == tenant_id)
                .filter(
                    ProvisioningJob.job_type.in_(
                        ["sync_tenant_schema", "repair_tenant_schema"]
                    )
                )
                .order_by(ProvisioningJob.id.desc())
                .first()
            )
        except Exception:
            return None

    def _get_live_provisioning_tenant_ids(self, db: Session) -> set[int]:
        if not hasattr(db, "query"):
            return set()
        try:
            rows = (
                db.query(ProvisioningJob.tenant_id)
                .filter(ProvisioningJob.status.in_(["pending", "retry_pending", "running"]))
                .all()
            )
        except Exception:
            return set()

        tenant_ids: set[int] = set()
        for row in rows:
            tenant_id = getattr(row, "tenant_id", None)
            if tenant_id is None and isinstance(row, tuple) and row:
                tenant_id = row[0]
            if tenant_id is not None:
                tenant_ids.add(int(tenant_id))
        return tenant_ids

    def _is_tenant_db_configured(self, tenant: Tenant) -> bool:
        return bool(
            getattr(tenant, "db_name", None)
            and getattr(tenant, "db_user", None)
            and getattr(tenant, "db_host", None)
            and getattr(tenant, "db_port", None)
        )

    def _safe_query_recent_rows(
        self,
        query,
        *,
        order_by_attr: str,
        limit: int,
    ) -> list:
        try:
            column_expr = getattr(query.column_descriptions[0]["entity"], order_by_attr)
        except Exception:
            column_expr = None

        try:
            if column_expr is not None and hasattr(query, "order_by"):
                query = query.order_by(column_expr.desc())
            if hasattr(query, "limit"):
                query = query.limit(limit)
            if hasattr(query, "all"):
                return list(query.all())
        except Exception:
            return []
        return []

    @staticmethod
    def _json_default(value):
        if isinstance(value, datetime):
            return value.isoformat()
        return str(value)

    def set_plan(
        self,
        db: Session,
        tenant_id: int,
        *,
        plan_code: str | None = None,
    ) -> Tenant:
        tenant = self.tenant_repository.get_by_id(db, tenant_id)
        if not tenant:
            raise ValueError("Tenant not found")

        tenant.plan_code = self._normalize_plan_code(plan_code)
        return self.tenant_repository.save(db, tenant)

    def get_tenant_module_limits(self, tenant: Tenant) -> dict[str, int] | None:
        raw_value = getattr(tenant, "module_limits_json", None)
        if not raw_value:
            return None
        try:
            parsed = json.loads(raw_value)
        except (TypeError, ValueError, json.JSONDecodeError):
            return None
        if not isinstance(parsed, dict):
            return None
        normalized = self._normalize_module_limits_override(parsed)
        return normalized

    def get_effective_module_limits(
        self,
        tenant: Tenant,
        *,
        now: datetime | None = None,
    ) -> dict[str, int] | None:
        effective_limits, _ = self._resolve_effective_module_limits_with_sources(
            tenant,
            now=now,
        )
        return effective_limits

    def get_effective_module_limit_sources(
        self,
        tenant: Tenant,
        *,
        now: datetime | None = None,
    ) -> dict[str, str] | None:
        _, sources = self._resolve_effective_module_limits_with_sources(
            tenant,
            now=now,
        )
        return sources

    def set_billing_state(
        self,
        db: Session,
        tenant_id: int,
        *,
        billing_status: str | None = None,
        billing_status_reason: str | None = None,
        billing_current_period_ends_at: datetime | None = None,
        billing_grace_until: datetime | None = None,
    ) -> Tenant:
        tenant = self.tenant_repository.get_by_id(db, tenant_id)
        if not tenant:
            raise ValueError("Tenant not found")

        normalized_billing_status = self._normalize_billing_status(billing_status)
        if (
            billing_current_period_ends_at is not None
            and billing_grace_until is not None
            and billing_grace_until < billing_current_period_ends_at
        ):
            raise ValueError("Billing grace must be after current period end")

        tenant.billing_status = normalized_billing_status
        tenant.billing_status_reason = (
            billing_status_reason.strip() if billing_status_reason else None
        )
        tenant.billing_current_period_ends_at = billing_current_period_ends_at
        tenant.billing_grace_until = billing_grace_until
        return self.tenant_repository.save(db, tenant)

    def set_billing_identity(
        self,
        db: Session,
        tenant_id: int,
        *,
        billing_provider: str | None = None,
        billing_provider_customer_id: str | None = None,
        billing_provider_subscription_id: str | None = None,
        preserve_existing_missing: bool = False,
    ) -> Tenant:
        tenant = self.tenant_repository.get_by_id(db, tenant_id)
        if not tenant:
            raise ValueError("Tenant not found")

        normalized_provider = self._normalize_billing_provider(billing_provider)
        normalized_customer_id = self._normalize_external_identifier(
            billing_provider_customer_id
        )
        normalized_subscription_id = self._normalize_external_identifier(
            billing_provider_subscription_id
        )

        if preserve_existing_missing:
            if normalized_provider is not None:
                tenant.billing_provider = normalized_provider
            if normalized_customer_id is not None:
                tenant.billing_provider_customer_id = normalized_customer_id
            if normalized_subscription_id is not None:
                tenant.billing_provider_subscription_id = normalized_subscription_id
        else:
            tenant.billing_provider = normalized_provider
            tenant.billing_provider_customer_id = normalized_customer_id
            tenant.billing_provider_subscription_id = normalized_subscription_id
        return self.tenant_repository.save(db, tenant)

    def resolve_tenant_for_billing_provider_event(
        self,
        db: Session,
        *,
        provider: str,
        tenant_slug: str | None = None,
        provider_customer_id: str | None = None,
        provider_subscription_id: str | None = None,
    ) -> Tenant | None:
        normalized_provider = self._normalize_billing_provider(provider)
        normalized_subscription_id = self._normalize_external_identifier(
            provider_subscription_id
        )
        normalized_customer_id = self._normalize_external_identifier(
            provider_customer_id
        )

        if normalized_provider and normalized_subscription_id:
            tenant = self.tenant_repository.get_by_billing_provider_subscription_id(
                db,
                provider=normalized_provider,
                provider_subscription_id=normalized_subscription_id,
            )
            if tenant is not None:
                return tenant

        if normalized_provider and normalized_customer_id:
            tenant = self.tenant_repository.get_by_billing_provider_customer_id(
                db,
                provider=normalized_provider,
                provider_customer_id=normalized_customer_id,
            )
            if tenant is not None:
                return tenant

        if tenant_slug:
            return self.tenant_repository.get_by_slug(db, tenant_slug)

        return None

    def is_tenant_under_maintenance(
        self,
        tenant: Tenant,
        now: datetime | None = None,
    ) -> bool:
        if tenant.maintenance_mode:
            return True

        if not tenant.maintenance_starts_at or not tenant.maintenance_ends_at:
            return False

        maintenance_starts_at = self._coerce_utc_datetime(tenant.maintenance_starts_at)
        maintenance_ends_at = self._coerce_utc_datetime(tenant.maintenance_ends_at)
        current_time = self._coerce_utc_datetime(now or datetime.now(timezone.utc))
        return maintenance_starts_at <= current_time <= maintenance_ends_at

    def get_tenant_maintenance_scopes(self, tenant: Tenant) -> list[str]:
        if not tenant.maintenance_scopes:
            return ["all"]
        return [scope.strip() for scope in tenant.maintenance_scopes.split(",") if scope.strip()]

    def _normalize_maintenance_scopes(
        self,
        maintenance_scopes: list[str] | None,
    ) -> list[str]:
        scopes = maintenance_scopes or ["all"]
        normalized = sorted({scope.strip() for scope in scopes if scope and scope.strip()})

        if not normalized:
            normalized = ["all"]

        invalid = set(normalized) - self.VALID_MAINTENANCE_SCOPES
        if invalid:
            raise ValueError("Invalid maintenance scopes")

        if "all" in normalized:
            return ["all"]

        return normalized

    def _coerce_utc_datetime(self, value: datetime) -> datetime:
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)

    def get_tenant_status_error(
        self,
        tenant: Tenant,
    ) -> tuple[int, str] | None:
        access_policy = self.get_tenant_access_policy(tenant)
        if access_policy.allowed:
            return None

        return (
            access_policy.status_code or 503,
            access_policy.detail or "Tenant unavailable",
        )

    def get_tenant_access_policy(
        self,
        tenant: Tenant,
        *,
        now: datetime | None = None,
    ) -> TenantAccessPolicy:
        if tenant.status != "active":
            status_errors = {
                "pending": (
                    503,
                    "Tenant provisioning pending",
                ),
                "suspended": (
                    423,
                    "Tenant suspended",
                ),
                "error": (
                    503,
                    "Tenant unavailable due to operational error",
                ),
                "archived": (
                    403,
                    "Tenant archived",
                ),
            }
            status_code, detail = status_errors.get(
                tenant.status,
                (503, "Tenant unavailable"),
            )
            return TenantAccessPolicy(
                allowed=False,
                status_code=status_code,
                detail=detail,
                blocking_source="status",
            )

        billing_status = (getattr(tenant, "billing_status", None) or "").strip().lower()
        current_time = now or datetime.now(timezone.utc)
        billing_current_period_ends_at = getattr(
            tenant,
            "billing_current_period_ends_at",
            None,
        )
        billing_grace_until = getattr(tenant, "billing_grace_until", None)

        if billing_status == "past_due":
            in_grace = (
                billing_grace_until is not None
                and current_time <= billing_grace_until
            )
            if in_grace:
                return TenantAccessPolicy(
                    allowed=True,
                    billing_in_grace=True,
                )

        if billing_status == "canceled":
            in_current_period = (
                billing_current_period_ends_at is not None
                and current_time <= billing_current_period_ends_at
            )
            if in_current_period:
                return TenantAccessPolicy(allowed=True)

        billing_error = self.get_tenant_billing_error(tenant, now=current_time)
        if billing_error is not None:
            status_code, detail = billing_error
            return TenantAccessPolicy(
                allowed=False,
                status_code=status_code,
                detail=detail,
                blocking_source="billing",
            )

        return TenantAccessPolicy(allowed=True)

    def get_tenant_billing_error(
        self,
        tenant: Tenant,
        *,
        now: datetime | None = None,
    ) -> tuple[int, str] | None:
        current_time = now or datetime.now(timezone.utc)
        billing_status = (getattr(tenant, "billing_status", None) or "").strip().lower()
        billing_status_reason = getattr(tenant, "billing_status_reason", None)
        billing_current_period_ends_at = getattr(
            tenant,
            "billing_current_period_ends_at",
            None,
        )
        billing_grace_until = getattr(tenant, "billing_grace_until", None)

        if billing_status in {"", "trialing", "active"}:
            return None

        if billing_status == "past_due":
            if (
                billing_grace_until is not None
                and current_time <= billing_grace_until
            ):
                return None
            return (
                423,
                billing_status_reason or "Tenant suspended due to overdue billing",
            )

        if billing_status == "suspended":
            return (
                423,
                billing_status_reason or "Tenant suspended by billing policy",
            )

        if billing_status == "canceled":
            if (
                billing_current_period_ends_at is not None
                and current_time <= billing_current_period_ends_at
            ):
                return None
            return (
                403,
                billing_status_reason or "Tenant subscription canceled",
            )

        return None

    def _normalize_rate_limit_override(
        self,
        value: int | None,
        *,
        field_name: str,
    ) -> int | None:
        if value is None:
            return None
        if value < 0:
            raise ValueError(f"{field_name} must be greater than or equal to 0")
        return value

    def _normalize_plan_code(self, plan_code: str | None) -> str | None:
        if plan_code is None:
            return None

        normalized_plan_code = plan_code.strip().lower()
        if not normalized_plan_code:
            return None

        if not self.tenant_plan_policy_service.has_plan(normalized_plan_code):
            raise ValueError("Invalid tenant plan")

        return normalized_plan_code

    def _is_valid_email(self, value: str) -> bool:
        parsed_name, parsed_email = parseaddr(value)
        if parsed_name:
            return False
        if not parsed_email or "@" not in parsed_email:
            return False
        local_part, _, domain = parsed_email.partition("@")
        return bool(local_part and domain and "." in domain)

    def _normalize_module_limits_override(
        self,
        module_limits: dict[str, int | None] | None,
    ) -> dict[str, int] | None:
        if module_limits is None:
            return None
        if not isinstance(module_limits, dict):
            raise ValueError("module_limits debe ser un objeto")

        normalized: dict[str, int] = {}
        valid_keys = self.tenant_plan_policy_service.VALID_MODULE_LIMIT_KEYS
        for key, value in module_limits.items():
            normalized_key = str(key).strip().lower()
            if normalized_key not in valid_keys:
                raise ValueError("Invalid tenant module limit key")
            if value is None:
                continue
            try:
                normalized_value = int(value)
            except (TypeError, ValueError):
                raise ValueError("module_limits contiene valores invalidos") from None
            if normalized_value < 0:
                raise ValueError("module_limits no permite valores negativos")
            normalized[normalized_key] = normalized_value

        return normalized or None

    def _normalize_billing_status(self, billing_status: str | None) -> str | None:
        if billing_status is None:
            return None

        normalized_billing_status = billing_status.strip().lower()
        if not normalized_billing_status:
            return None

        if normalized_billing_status not in self.VALID_BILLING_STATUSES:
            raise ValueError("Invalid tenant billing status")

        return normalized_billing_status

    def _normalize_billing_provider(self, billing_provider: str | None) -> str | None:
        if billing_provider is None:
            return None

        normalized_billing_provider = billing_provider.strip().lower()
        if not normalized_billing_provider:
            return None

        return normalized_billing_provider

    def _normalize_external_identifier(self, value: str | None) -> str | None:
        if value is None:
            return None

        normalized_value = value.strip()
        if not normalized_value:
            return None

        return normalized_value

    def _apply_schema_tracking(self, tenant: Tenant, status: dict) -> None:
        tenant.tenant_schema_version = status.get("current_version")
        tenant.tenant_schema_synced_at = status.get("last_applied_at")

    def _validate_tenant_db_connection(
        self,
        *,
        host: str,
        port: int,
        database: str,
        username: str,
        password: str,
    ) -> None:
        session_factory = get_tenant_session_factory(
            host=host,
            port=port,
            database=database,
            username=username,
            password=password,
        )
        session = session_factory()
        bind = session.get_bind()
        try:
            session.execute(text("SELECT 1"))
        finally:
            session.close()
            bind.dispose()

    def _generate_tenant_db_password(self, length: int = 24) -> str:
        from secrets import choice
        import string

        alphabet = string.ascii_letters + string.digits + "!@#$%*-_"
        return "".join(choice(alphabet) for _ in range(length))

    def _resolve_effective_module_limits_with_sources(
        self,
        tenant: Tenant,
        *,
        now: datetime | None = None,
    ) -> tuple[dict[str, int] | None, dict[str, str] | None]:
        tenant_limits = self.get_tenant_module_limits(tenant)
        plan_limits = self.tenant_plan_policy_service.get_module_limits(tenant.plan_code)
        access_policy = self.get_tenant_access_policy(tenant, now=now)
        grace_policy = (
            self.tenant_billing_grace_policy_service.get_policy()
            if access_policy.billing_in_grace
            else None
        )
        grace_limits = None if grace_policy is None else grace_policy.module_limits
        base_limits = tenant_limits if tenant_limits is not None else plan_limits
        base_source = "tenant_override" if tenant_limits is not None else "plan"

        if base_limits is None and grace_limits is None:
            return None, None

        resolved_limits: dict[str, int] = {}
        resolved_sources: dict[str, str] = {}

        for key in set(base_limits or {}) | set(grace_limits or {}):
            limit, source = self._resolve_effective_limit_with_source(
                primary_limit=None if base_limits is None else base_limits.get(key),
                primary_source=base_source,
                secondary_limit=None if grace_limits is None else grace_limits.get(key),
                secondary_source="billing_grace",
            )
            if limit is not None:
                resolved_limits[key] = limit
                if source is not None:
                    resolved_sources[key] = source

        return resolved_limits or None, resolved_sources or None

    def _resolve_effective_limit_with_source(
        self,
        *,
        primary_limit: int | None,
        primary_source: str | None,
        secondary_limit: int | None,
        secondary_source: str | None,
    ) -> tuple[int | None, str | None]:
        if primary_limit is None:
            return secondary_limit, secondary_source if secondary_limit is not None else None
        if secondary_limit is None:
            return primary_limit, primary_source
        if primary_limit == 0:
            return secondary_limit, secondary_source
        if secondary_limit == 0:
            return primary_limit, primary_source
        if secondary_limit < primary_limit:
            return secondary_limit, secondary_source
        return primary_limit, primary_source
