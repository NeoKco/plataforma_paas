import secrets
import string

from sqlalchemy.orm import Session

from app.apps.installer.services.postgres_bootstrap_service import (
    PostgresBootstrapService,
)
from app.apps.platform_control.models.provisioning_job import ProvisioningJob
from app.apps.platform_control.models.tenant import Tenant
from app.common.config.settings import settings


class ProvisioningService:
    def run_job(self, db: Session, job_id: int) -> ProvisioningJob:
        job = db.query(ProvisioningJob).filter(ProvisioningJob.id == job_id).first()
        if not job:
            raise ValueError("Provisioning job not found")

        if job.status == "completed":
            raise ValueError("Provisioning job already completed")

        tenant = db.query(Tenant).filter(Tenant.id == job.tenant_id).first()
        if not tenant:
            raise ValueError("Tenant not found")

        db_name = f"tenant_{tenant.slug.replace('-', '_')}"
        db_user = f"user_{tenant.slug.replace('-', '_')}"
        db_password = self._generate_password()

        try:
            job.status = "running"
            db.commit()

            bootstrap = PostgresBootstrapService(
                admin_host=settings.CONTROL_DB_HOST,
                admin_port=settings.CONTROL_DB_PORT,
                admin_db_name="postgres",
                admin_user="postgres",
                admin_password=settings.POSTGRES_ADMIN_PASSWORD,
            )

            bootstrap.create_role_if_not_exists(db_user, db_password)
            bootstrap.create_database_if_not_exists(db_name, db_user)

            tenant.db_name = db_name
            tenant.db_user = db_user
            tenant.db_host = settings.CONTROL_DB_HOST
            tenant.db_port = settings.CONTROL_DB_PORT
            tenant.status = "active"

            job.status = "completed"
            job.error_message = None

            db.commit()
            db.refresh(job)

            print("==== TENANT DB CREATED ====")
            print(f"Tenant: {tenant.slug}")
            print(f"DB Name: {db_name}")
            print(f"DB User: {db_user}")
            print(f"DB Password: {db_password}")
            print("===========================")

            return job

        except Exception as exc:
            job.status = "failed"
            job.error_message = str(exc)
            tenant.status = "error"
            db.commit()
            db.refresh(job)
            raise

    def _generate_password(self, length: int = 20) -> str:
        alphabet = string.ascii_letters + string.digits + "!@#$%*-_"
        return "".join(secrets.choice(alphabet) for _ in range(length))