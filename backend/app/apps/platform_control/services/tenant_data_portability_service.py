from __future__ import annotations

import base64
import csv
from dataclasses import dataclass
from datetime import date, datetime, time, timezone
from decimal import Decimal
import hashlib
import json
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

from sqlalchemy import inspect, text
from sqlalchemy.orm import Session

from app.apps.platform_control.models.tenant import Tenant
from app.apps.platform_control.models.tenant_data_transfer_artifact import (
    TenantDataTransferArtifact,
)
from app.apps.platform_control.models.tenant_data_transfer_job import (
    TenantDataTransferJob,
)
from app.apps.platform_control.repositories.tenant_data_transfer_artifact_repository import (
    TenantDataTransferArtifactRepository,
)
from app.apps.platform_control.repositories.tenant_data_transfer_job_repository import (
    TenantDataTransferJobRepository,
)
from app.apps.platform_control.repositories.tenant_repository import TenantRepository
from app.apps.tenant_modules.core.services.tenant_connection_service import (
    TenantConnectionService,
)
from app.common.config.settings import settings


@dataclass(frozen=True)
class ExportedTableSummary:
    table_name: str
    row_count: int
    sha256_hex: str
    csv_file_name: str


class TenantDataPortabilityService:
    PORTABLE_MINIMUM_SCOPE = "portable_minimum"
    PORTABLE_MINIMUM_TABLES = (
        "tenant_info",
        "roles",
        "users",
        "business_organizations",
        "business_contacts",
        "business_clients",
        "business_sites",
        "business_task_types",
        "business_work_groups",
        "maintenance_installations",
        "maintenance_schedules",
        "maintenance_due_items",
        "maintenance_work_orders",
        "finance_accounts",
        "finance_categories",
        "finance_currencies",
        "finance_transactions",
    )

    def __init__(
        self,
        tenant_repository: TenantRepository | None = None,
        tenant_connection_service: TenantConnectionService | None = None,
        job_repository: TenantDataTransferJobRepository | None = None,
        artifact_repository: TenantDataTransferArtifactRepository | None = None,
    ) -> None:
        self.tenant_repository = tenant_repository or TenantRepository()
        self.tenant_connection_service = (
            tenant_connection_service or TenantConnectionService()
        )
        self.job_repository = job_repository or TenantDataTransferJobRepository()
        self.artifact_repository = (
            artifact_repository or TenantDataTransferArtifactRepository()
        )

    def create_export_job(
        self,
        db: Session,
        *,
        tenant_id: int,
        requested_by_email: str | None,
        export_scope: str = PORTABLE_MINIMUM_SCOPE,
    ) -> TenantDataTransferJob:
        tenant = self.tenant_repository.get_by_id(db, tenant_id)
        if not tenant:
            raise ValueError("Tenant not found")

        if export_scope != self.PORTABLE_MINIMUM_SCOPE:
            raise ValueError("Unsupported tenant data export scope")

        self._ensure_tenant_exportable(tenant)

        job = self.job_repository.create(
            db,
            tenant_id=tenant.id,
            direction="export",
            data_format="csv_zip",
            export_scope=export_scope,
            status="running",
            requested_by_email=requested_by_email,
        )

        try:
            artifact = self._run_portable_minimum_export(db=db, tenant=tenant, job=job)
            summary = {
                "artifact_id": artifact.id,
                "artifact_file_name": artifact.file_name,
                "artifact_size_bytes": artifact.size_bytes,
                "artifact_sha256_hex": artifact.sha256_hex,
                "tables_exported": json.loads(job.summary_json or "[]"),
            }
            job.summary_json = json.dumps(summary)
            job.status = "completed"
            job.completed_at = datetime.now(timezone.utc)
            return self.job_repository.save(db, job)
        except Exception as exc:
            job.status = "failed"
            job.error_message = str(exc)
            job.completed_at = datetime.now(timezone.utc)
            self.job_repository.save(db, job)
            raise

    def list_export_jobs(
        self,
        db: Session,
        *,
        tenant_id: int,
        limit: int = 10,
    ) -> list[TenantDataTransferJob]:
        tenant = self.tenant_repository.get_by_id(db, tenant_id)
        if not tenant:
            raise ValueError("Tenant not found")
        return self.job_repository.list_by_tenant(db, tenant_id, limit=limit)

    def get_export_job(
        self,
        db: Session,
        *,
        tenant_id: int,
        job_id: int,
    ) -> TenantDataTransferJob:
        job = self.job_repository.get_by_id(db, job_id)
        if not job or job.tenant_id != tenant_id:
            raise ValueError("Tenant data export job not found")
        return job

    def get_export_artifact(
        self,
        db: Session,
        *,
        tenant_id: int,
        job_id: int,
    ) -> tuple[TenantDataTransferJob, TenantDataTransferArtifact, Path]:
        job = self.get_export_job(db, tenant_id=tenant_id, job_id=job_id)
        if job.status != "completed":
            raise ValueError("Tenant data export job is not completed")
        artifact = job.artifacts[0] if job.artifacts else None
        if artifact is None:
            raise ValueError("Tenant data export artifact not found")
        artifact_path = Path(artifact.stored_path)
        if not artifact_path.exists():
            raise ValueError("Tenant data export artifact file is missing")
        return job, artifact, artifact_path

    def _ensure_tenant_exportable(self, tenant: Tenant) -> None:
        if not (
            tenant.db_name
            and tenant.db_user
            and tenant.db_host
            and tenant.db_port
        ):
            raise ValueError("Tenant database configuration is incomplete")

    def _run_portable_minimum_export(
        self,
        *,
        db: Session,
        tenant: Tenant,
        job: TenantDataTransferJob,
    ) -> TenantDataTransferArtifact:
        export_dir = self._build_job_directory(tenant.slug, job.id)
        export_dir.mkdir(parents=True, exist_ok=True)

        tenant_session_factory = self.tenant_connection_service.get_tenant_session(tenant)
        exported_tables: list[ExportedTableSummary] = []
        skipped_tables: list[str] = []

        tenant_db = tenant_session_factory()
        try:
            inspector = inspect(tenant_db.bind)
            available_tables = set(inspector.get_table_names())
            for table_name in self.PORTABLE_MINIMUM_TABLES:
                if table_name not in available_tables:
                    skipped_tables.append(table_name)
                    continue
                exported_tables.append(
                    self._export_table_csv(tenant_db, export_dir, table_name)
                )
        finally:
            tenant_db.close()

        manifest = self._build_manifest(
            tenant=tenant,
            job=job,
            exported_tables=exported_tables,
            skipped_tables=skipped_tables,
        )
        manifest_path = export_dir / "manifest.json"
        manifest_path.write_text(
            json.dumps(manifest, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

        archive_file_name = f"{tenant.slug}-portable-export-job-{job.id}.zip"
        archive_path = export_dir / archive_file_name
        with ZipFile(archive_path, "w", compression=ZIP_DEFLATED) as archive:
            archive.write(manifest_path, arcname="manifest.json")
            for table_summary in exported_tables:
                csv_path = export_dir / table_summary.csv_file_name
                archive.write(csv_path, arcname=table_summary.csv_file_name)

        archive_sha = self._compute_sha256(archive_path)
        artifact = self.artifact_repository.create(
            db,
            job_id=job.id,
            artifact_type="tenant_portable_csv_zip",
            file_name=archive_file_name,
            stored_path=str(archive_path),
            content_type="application/zip",
            sha256_hex=archive_sha,
            size_bytes=archive_path.stat().st_size,
        )
        job.summary_json = json.dumps(
            [summary.__dict__ for summary in exported_tables],
            ensure_ascii=False,
        )
        self.job_repository.save(db, job)
        return artifact

    def _build_job_directory(self, tenant_slug: str, job_id: int) -> Path:
        root = Path(settings.TENANT_DATA_EXPORT_ARTIFACTS_DIR)
        return root / tenant_slug / f"job_{job_id}"

    def _export_table_csv(
        self,
        tenant_db: Session,
        export_dir: Path,
        table_name: str,
    ) -> ExportedTableSummary:
        result = tenant_db.execute(text(f'SELECT * FROM "{table_name}"'))
        rows = result.mappings().all()
        field_names = list(result.keys())
        csv_file_name = f"{table_name}.csv"
        csv_path = export_dir / csv_file_name

        with csv_path.open("w", encoding="utf-8", newline="") as csv_file:
            writer = csv.DictWriter(csv_file, fieldnames=field_names)
            writer.writeheader()
            for row in rows:
                writer.writerow(
                    {
                        key: self._serialize_value(row.get(key))
                        for key in field_names
                    }
                )

        return ExportedTableSummary(
            table_name=table_name,
            row_count=len(rows),
            sha256_hex=self._compute_sha256(csv_path),
            csv_file_name=csv_file_name,
        )

    def _build_manifest(
        self,
        *,
        tenant: Tenant,
        job: TenantDataTransferJob,
        exported_tables: list[ExportedTableSummary],
        skipped_tables: list[str],
    ) -> dict:
        return {
            "manifest_version": "1.0",
            "direction": "export",
            "data_format": "csv_zip",
            "export_scope": job.export_scope,
            "tenant": {
                "id": tenant.id,
                "slug": tenant.slug,
                "name": tenant.name,
                "tenant_type": tenant.tenant_type,
                "status": tenant.status,
                "schema_version": tenant.tenant_schema_version,
            },
            "job": {
                "id": job.id,
                "created_at": self._serialize_value(job.created_at),
                "requested_by_email": job.requested_by_email,
            },
            "tables": [summary.__dict__ for summary in exported_tables],
            "skipped_tables": skipped_tables,
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }

    def _serialize_value(self, value):
        if value is None:
            return ""
        if isinstance(value, (datetime, date, time)):
            return value.isoformat()
        if isinstance(value, Decimal):
            return str(value)
        if isinstance(value, bytes):
            return base64.b64encode(value).decode("ascii")
        if isinstance(value, (dict, list, tuple)):
            return json.dumps(value, ensure_ascii=False)
        return value

    def _compute_sha256(self, path: Path) -> str:
        digest = hashlib.sha256()
        with path.open("rb") as file_handle:
            while True:
                chunk = file_handle.read(1024 * 1024)
                if not chunk:
                    break
                digest.update(chunk)
        return digest.hexdigest()
