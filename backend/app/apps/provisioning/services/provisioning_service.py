import secrets
import string
from datetime import datetime, timedelta, timezone
from pathlib import Path

from sqlalchemy.orm import Session

from app.apps.installer.services.postgres_bootstrap_service import (
    PostgresBootstrapService,
)
from app.apps.platform_control.models.provisioning_job import ProvisioningJob
from app.apps.platform_control.models.tenant import Tenant
from app.apps.platform_control.repositories.provisioning_job_repository import (
    ProvisioningJobRepository,
)
from app.apps.platform_control.repositories.tenant_repository import TenantRepository
from app.apps.platform_control.services.tenant_service import TenantService
from app.apps.provisioning.services.tenant_db_bootstrap_service import (
    TenantDatabaseBootstrapService,
)
from app.apps.provisioning.services.provisioning_dispatch_service import (
    ProvisioningDispatchService,
)
from app.common.config.settings import settings
from app.common.observability.logging_service import LoggingService
from app.common.security.tenant_secret_service import TenantSecretService


class ProvisioningService:
    ERROR_CODES_BY_STAGE = {
        "mark_running": "provisioning_state_update_failed",
        "bootstrap_role": "postgres_role_bootstrap_failed",
        "bootstrap_database": "postgres_database_bootstrap_failed",
        "bootstrap_tenant_schema": "tenant_schema_bootstrap_failed",
        "store_tenant_secret": "tenant_secret_store_failed",
        "deprovision_tenant_database": "tenant_database_drop_failed",
        "deprovision_tenant_role": "tenant_role_drop_failed",
        "deprovision_tenant_secret": "tenant_secret_clear_failed",
        "persist_completion": "provisioning_completion_persist_failed",
    }

    def __init__(
        self,
        tenant_repository: TenantRepository | None = None,
        provisioning_job_repository: ProvisioningJobRepository | None = None,
        provisioning_dispatch_service: ProvisioningDispatchService | None = None,
        tenant_service: TenantService | None = None,
        tenant_secret_service: TenantSecretService | None = None,
        logging_service: LoggingService | None = None,
    ):
        self.tenant_repository = tenant_repository or TenantRepository()
        self.provisioning_job_repository = (
            provisioning_job_repository or ProvisioningJobRepository()
        )
        self.provisioning_dispatch_service = (
            provisioning_dispatch_service
            or ProvisioningDispatchService(
                provisioning_job_repository=self.provisioning_job_repository,
            )
        )
        self.tenant_service = tenant_service or TenantService()
        self.tenant_secret_service = tenant_secret_service or TenantSecretService()
        self.logging_service = logging_service or LoggingService(
            logger_name="platform_paas.ops"
        )

    def run_job(self, db: Session, job_id: int) -> ProvisioningJob:
        job = self.provisioning_job_repository.get_by_id(db, job_id)
        if not job:
            raise ValueError("Provisioning job not found")

        if job.status == "completed":
            raise ValueError("Provisioning job already completed")
        if job.status == "running":
            raise ValueError("Provisioning job already running")
        if job.status == "failed":
            raise ValueError("Provisioning job already failed")

        tenant = self.tenant_repository.get_by_id(db, job.tenant_id)
        if not tenant:
            raise ValueError("Tenant not found")

        started_at = time_started = datetime.now(timezone.utc)
        current_stage = "mark_running"
        provisioning_output: dict | None = None

        try:
            job.status = "running"
            job.attempts += 1
            job.last_attempt_at = datetime.now(timezone.utc)
            job.next_retry_at = None
            job.error_code = None
            db.commit()

            if job.job_type == "create_tenant_database":
                provisioning_output = self._run_create_tenant_database(
                    db=db,
                    tenant=tenant,
                )
            elif job.job_type == "deprovision_tenant_database":
                provisioning_output = self._run_deprovision_tenant_database(
                    db=db,
                    tenant=tenant,
                )
            else:
                raise ValueError("Unsupported provisioning job type")

            job.status = "completed"
            job.error_code = None
            job.error_message = None
            job.next_retry_at = None

            current_stage = "persist_completion"
            db.commit()
            self.provisioning_job_repository.refresh(db, job)
            self.provisioning_dispatch_service.finalize_job(job=job)
            self._log_job_result(
                job=job,
                tenant=tenant,
                started_at=time_started,
            )

            if job.job_type == "create_tenant_database" and provisioning_output is not None:
                print("==== TENANT DB CREATED ====")
                print(f"Tenant: {tenant.slug}")
                print(f"DB Name: {provisioning_output['db_name']}")
                print(f"DB User: {provisioning_output['db_user']}")
                print(
                    "DB Password saved in env var: "
                    f"{provisioning_output['env_var_name']}="
                    f"{self.tenant_secret_service.mask_secret(provisioning_output['db_password'])}"
                )
                print("Tenant admin email: admin@{0}.local".format(tenant.slug))
                print("Tenant admin password: TenantAdmin123! (bootstrap de desarrollo)")
                print("===========================")

            return job

        except Exception as exc:
            current_stage = getattr(exc, "_provisioning_stage", current_stage)
            job.error_code = self._classify_error_code(current_stage)
            job.error_message = str(exc)
            if job.attempts >= job.max_attempts:
                job.status = "failed"
                if self._should_mark_tenant_error_on_failure(job.job_type):
                    tenant.status = "error"
                job.next_retry_at = None
            else:
                job.status = "retry_pending"
                job.next_retry_at = datetime.now(timezone.utc) + timedelta(
                    seconds=self._calculate_retry_delay_seconds(job.attempts)
                )
                if (
                    self._should_reset_tenant_to_pending_on_retry(job.job_type)
                    and tenant.status != "active"
                ):
                    tenant.status = "pending"
            db.commit()
            self.provisioning_job_repository.refresh(db, job)
            self.provisioning_dispatch_service.finalize_job(job=job)
            self._log_job_result(
                job=job,
                tenant=tenant,
                started_at=time_started,
            )
            raise

    def requeue_failed_job(
        self,
        db: Session,
        job_id: int,
        *,
        reset_attempts: bool = True,
        delay_seconds: int = 0,
    ) -> ProvisioningJob:
        job = self.provisioning_job_repository.get_by_id(db, job_id)
        if not job:
            raise ValueError("Provisioning job not found")

        if job.status != "failed":
            raise ValueError("Provisioning job is not in failed state")

        tenant = self.tenant_repository.get_by_id(db, job.tenant_id)
        if not tenant:
            raise ValueError("Tenant not found")

        job.status = "pending"
        job.next_retry_at = None
        job.error_code = None
        job.error_message = None
        if reset_attempts:
            job.attempts = 0

        if tenant.status != "active":
            if self._should_reset_tenant_to_pending_on_retry(job.job_type):
                tenant.status = "pending"

        db.commit()
        self.provisioning_job_repository.refresh(db, job)
        delay_seconds = max(delay_seconds, 0)
        due_at = None
        if delay_seconds > 0:
            due_at = datetime.now(timezone.utc) + timedelta(seconds=delay_seconds)
        self.provisioning_dispatch_service.requeue_dead_letter_job(
            db,
            job_id=job.id,
            due_at=due_at,
        )
        return job

    def requeue_failed_jobs(
        self,
        db: Session,
        *,
        limit: int = 50,
        job_type: str | None = None,
        tenant_slug: str | None = None,
        error_code: str | None = None,
        error_contains: str | None = None,
        reset_attempts: bool = True,
        delay_seconds: int = 0,
    ) -> list[ProvisioningJob]:
        delay_seconds = max(delay_seconds, 0)
        jobs = self.provisioning_dispatch_service.list_dead_letter_jobs(
            db,
            limit=limit,
            job_type=job_type,
            tenant_slug=tenant_slug,
            error_code=error_code,
            error_contains=error_contains,
        )
        requeued: list[ProvisioningJob] = []
        for item in jobs:
            job = self.requeue_failed_job(
                db,
                item["job"].id,
                reset_attempts=reset_attempts,
                delay_seconds=delay_seconds,
            )
            requeued.append(job)
        return requeued

    def _generate_password(self, length: int = 20) -> str:
        alphabet = string.ascii_letters + string.digits + "!@#$%*-_"
        return "".join(secrets.choice(alphabet) for _ in range(length))

    def _classify_error_code(self, current_stage: str) -> str:
        return self.ERROR_CODES_BY_STAGE.get(
            current_stage,
            "provisioning_unknown_error",
        )

    def _calculate_retry_delay_seconds(self, attempt_number: int) -> int:
        base = max(settings.WORKER_RETRY_BASE_SECONDS, 1)
        delay = base * (2 ** max(attempt_number - 1, 0))
        return min(delay, settings.WORKER_MAX_RETRY_SECONDS)

    def _should_mark_tenant_error_on_failure(self, job_type: str) -> bool:
        return job_type == "create_tenant_database"

    def _should_reset_tenant_to_pending_on_retry(self, job_type: str) -> bool:
        return job_type == "create_tenant_database"

    def _run_create_tenant_database(self, db: Session, tenant: Tenant) -> dict:
        db_name = f"tenant_{tenant.slug.replace('-', '_')}"
        db_user = f"user_{tenant.slug.replace('-', '_')}"
        db_password = self._generate_password()

        current_stage = "bootstrap_role"
        bootstrap = PostgresBootstrapService(
            admin_host=settings.CONTROL_DB_HOST,
            admin_port=settings.CONTROL_DB_PORT,
            admin_db_name="postgres",
            admin_user="postgres",
            admin_password=settings.POSTGRES_ADMIN_PASSWORD,
        )

        try:
            bootstrap.create_role_if_not_exists(db_user, db_password)
            current_stage = "bootstrap_database"
            bootstrap.create_database_if_not_exists(db_name, db_user)

            current_stage = "bootstrap_tenant_schema"
            tenant_bootstrap = TenantDatabaseBootstrapService()
            tenant_bootstrap.bootstrap(
                host=settings.CONTROL_DB_HOST,
                port=settings.CONTROL_DB_PORT,
                database=db_name,
                username=db_user,
                password=db_password,
                tenant_name=tenant.name,
                tenant_slug=tenant.slug,
                tenant_type=tenant.tenant_type,
            )

            tenant.db_name = db_name
            tenant.db_user = db_user
            tenant.db_host = settings.CONTROL_DB_HOST
            tenant.db_port = settings.CONTROL_DB_PORT
            tenant.status = "active"

            current_stage = "store_tenant_secret"
            env_var_name = self.tenant_secret_service.store_tenant_db_password(
                tenant_slug=tenant.slug,
                password=db_password,
                env_path=Path(settings.BASE_DIR) / ".env",
            )
            return {
                "db_name": db_name,
                "db_user": db_user,
                "db_password": db_password,
                "env_var_name": env_var_name,
            }
        except Exception as exc:
            setattr(exc, "_provisioning_stage", current_stage)
            raise

    def _run_deprovision_tenant_database(self, db: Session, tenant: Tenant) -> dict:
        try:
            return self.tenant_service.deprovision_tenant(db=db, tenant_id=tenant.id)
        except Exception as exc:
            detail = str(exc)
            if "drop database" in detail.lower():
                setattr(exc, "_provisioning_stage", "deprovision_tenant_database")
            elif "drop role" in detail.lower():
                setattr(exc, "_provisioning_stage", "deprovision_tenant_role")
            elif "secret" in detail.lower() or "password" in detail.lower():
                setattr(exc, "_provisioning_stage", "deprovision_tenant_secret")
            raise

    def _log_job_result(
        self,
        *,
        job: ProvisioningJob,
        tenant: Tenant,
        started_at: datetime,
    ) -> None:
        duration_ms = max(
            int((datetime.now(timezone.utc) - started_at).total_seconds() * 1000),
            0,
        )
        self.logging_service.log_provisioning_job_result(
            job_id=job.id,
            tenant_id=tenant.id,
            tenant_slug=tenant.slug,
            status=job.status,
            attempts=job.attempts,
            max_attempts=job.max_attempts,
            duration_ms=duration_ms,
            next_retry_at=job.next_retry_at,
            error_message=job.error_message,
        )
