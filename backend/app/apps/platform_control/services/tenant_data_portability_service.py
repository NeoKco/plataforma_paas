from __future__ import annotations

import base64
import csv
from dataclasses import dataclass
from datetime import date, datetime, time, timezone
from decimal import Decimal
import hashlib
import io
import json
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

from sqlalchemy import MetaData, Table, inspect, select, text
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


@dataclass(frozen=True)
class ImportedTableSummary:
    table_name: str
    rows_in_package: int
    existing_rows: int
    insertable_rows: int
    inserted_rows: int
    status: str
    reason: str | None = None


class TenantDataPortabilityService:
    PORTABLE_MINIMUM_SCOPE = "portable_minimum"
    IMPORT_STRATEGY_SKIP_EXISTING = "skip_existing"
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
            job.summary_json = json.dumps(summary, ensure_ascii=False)
            job.status = "completed"
            job.completed_at = datetime.now(timezone.utc)
            return self.job_repository.save(db, job)
        except Exception as exc:
            job.status = "failed"
            job.error_message = str(exc)
            job.completed_at = datetime.now(timezone.utc)
            self.job_repository.save(db, job)
            raise

    def create_import_job(
        self,
        db: Session,
        *,
        tenant_id: int,
        requested_by_email: str | None,
        package_bytes: bytes,
        package_file_name: str,
        dry_run: bool = True,
        import_strategy: str = IMPORT_STRATEGY_SKIP_EXISTING,
    ) -> TenantDataTransferJob:
        tenant = self.tenant_repository.get_by_id(db, tenant_id)
        if not tenant:
            raise ValueError("Tenant not found")

        self._ensure_tenant_importable(tenant)
        if import_strategy != self.IMPORT_STRATEGY_SKIP_EXISTING:
            raise ValueError("Unsupported tenant data import strategy")
        if not package_bytes:
            raise ValueError("Tenant data import package is empty")
        if not package_file_name.lower().endswith(".zip"):
            raise ValueError("Tenant data import package must be a zip file")

        job = self.job_repository.create(
            db,
            tenant_id=tenant.id,
            direction="import",
            data_format="csv_zip",
            export_scope=self.PORTABLE_MINIMUM_SCOPE,
            status="running",
            requested_by_email=requested_by_email,
        )

        try:
            self._run_portable_minimum_import(
                db=db,
                tenant=tenant,
                job=job,
                package_bytes=package_bytes,
                package_file_name=package_file_name,
                dry_run=dry_run,
                import_strategy=import_strategy,
            )
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
        return self.job_repository.list_by_tenant(
            db,
            tenant_id,
            limit=limit,
            direction="export",
        )

    def list_import_jobs(
        self,
        db: Session,
        *,
        tenant_id: int,
        limit: int = 10,
    ) -> list[TenantDataTransferJob]:
        tenant = self.tenant_repository.get_by_id(db, tenant_id)
        if not tenant:
            raise ValueError("Tenant not found")
        return self.job_repository.list_by_tenant(
            db,
            tenant_id,
            limit=limit,
            direction="import",
        )

    def get_export_job(
        self,
        db: Session,
        *,
        tenant_id: int,
        job_id: int,
    ) -> TenantDataTransferJob:
        job = self.job_repository.get_by_id(db, job_id)
        if not job or job.tenant_id != tenant_id or job.direction != "export":
            raise ValueError("Tenant data export job not found")
        return job

    def get_import_job(
        self,
        db: Session,
        *,
        tenant_id: int,
        job_id: int,
    ) -> TenantDataTransferJob:
        job = self.job_repository.get_by_id(db, job_id)
        if not job or job.tenant_id != tenant_id or job.direction != "import":
            raise ValueError("Tenant data import job not found")
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
        artifact = next(
            (item for item in job.artifacts if item.content_type == "application/zip"),
            None,
        )
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

    def _ensure_tenant_importable(self, tenant: Tenant) -> None:
        self._ensure_tenant_exportable(tenant)
        if tenant.status == "archived":
            raise ValueError("Archived tenants do not accept data import")
        if not tenant.tenant_schema_version:
            raise ValueError("Tenant schema version is unknown")

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

    def _run_portable_minimum_import(
        self,
        *,
        db: Session,
        tenant: Tenant,
        job: TenantDataTransferJob,
        package_bytes: bytes,
        package_file_name: str,
        dry_run: bool,
        import_strategy: str,
    ) -> None:
        import_dir = self._build_job_directory(tenant.slug, job.id)
        import_dir.mkdir(parents=True, exist_ok=True)

        package_path = import_dir / package_file_name
        package_path.write_bytes(package_bytes)
        self.artifact_repository.create(
            db,
            job_id=job.id,
            artifact_type="tenant_portable_csv_import_source_zip",
            file_name=package_file_name,
            stored_path=str(package_path),
            content_type="application/zip",
            sha256_hex=self._compute_sha256(package_path),
            size_bytes=package_path.stat().st_size,
        )

        manifest, table_payloads = self._read_import_package(
            package_path=package_path,
            target_tenant=tenant,
        )
        imported_tables = self._simulate_or_apply_import(
            tenant=tenant,
            table_payloads=table_payloads,
            dry_run=dry_run,
        )
        report = {
            "mode": "dry_run" if dry_run else "apply",
            "import_strategy": import_strategy,
            "source_file_name": package_file_name,
            "target_tenant": {
                "id": tenant.id,
                "slug": tenant.slug,
                "schema_version": tenant.tenant_schema_version,
            },
            "source_manifest": {
                "tenant_slug": manifest["tenant"]["slug"],
                "tenant_name": manifest["tenant"]["name"],
                "schema_version": manifest["tenant"]["schema_version"],
                "generated_at": manifest["generated_at"],
            },
            "tables": [summary.__dict__ for summary in imported_tables],
        }
        report_path = import_dir / "import-report.json"
        report_path.write_text(
            json.dumps(report, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        self.artifact_repository.create(
            db,
            job_id=job.id,
            artifact_type="tenant_portable_csv_import_report",
            file_name="import-report.json",
            stored_path=str(report_path),
            content_type="application/json",
            sha256_hex=self._compute_sha256(report_path),
            size_bytes=report_path.stat().st_size,
        )
        job.summary_json = json.dumps(report, ensure_ascii=False)
        self.job_repository.save(db, job)

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

    def _read_import_package(
        self,
        *,
        package_path: Path,
        target_tenant: Tenant,
    ) -> tuple[dict, dict[str, list[dict[str, str]]]]:
        with ZipFile(package_path, "r") as archive:
            if "manifest.json" not in archive.namelist():
                raise ValueError("Tenant data import package is missing manifest.json")
            manifest = json.loads(archive.read("manifest.json").decode("utf-8"))
            self._validate_import_manifest(manifest, target_tenant=target_tenant)
            table_payloads: dict[str, list[dict[str, str]]] = {}
            for table_entry in manifest.get("tables", []):
                csv_file_name = table_entry["csv_file_name"]
                if csv_file_name not in archive.namelist():
                    raise ValueError(
                        f"Tenant data import package is missing {csv_file_name}"
                    )
                csv_bytes = archive.read(csv_file_name)
                if hashlib.sha256(csv_bytes).hexdigest() != table_entry["sha256_hex"]:
                    raise ValueError(
                        f"Checksum mismatch detected for {csv_file_name}"
                    )
                csv_stream = io.StringIO(csv_bytes.decode("utf-8"))
                table_payloads[table_entry["table_name"]] = list(
                    csv.DictReader(csv_stream)
                )
        return manifest, table_payloads

    def _validate_import_manifest(
        self,
        manifest: dict,
        *,
        target_tenant: Tenant,
    ) -> None:
        if manifest.get("manifest_version") != "1.0":
            raise ValueError("Unsupported tenant data import manifest version")
        if manifest.get("direction") != "export":
            raise ValueError("Tenant data import package direction is invalid")
        if manifest.get("data_format") != "csv_zip":
            raise ValueError("Tenant data import package format is invalid")
        if manifest.get("export_scope") != self.PORTABLE_MINIMUM_SCOPE:
            raise ValueError("Unsupported tenant data import scope")
        source_schema_version = (manifest.get("tenant") or {}).get("schema_version")
        if not source_schema_version:
            raise ValueError("Tenant data import package is missing schema_version")
        if source_schema_version != target_tenant.tenant_schema_version:
            raise ValueError(
                "Tenant data import package schema_version does not match target tenant"
            )

    def _simulate_or_apply_import(
        self,
        *,
        tenant: Tenant,
        table_payloads: dict[str, list[dict[str, str]]],
        dry_run: bool,
    ) -> list[ImportedTableSummary]:
        tenant_session_factory = self.tenant_connection_service.get_tenant_session(tenant)
        tenant_db = tenant_session_factory()
        summaries: list[ImportedTableSummary] = []
        try:
            tenant_engine = tenant_db.bind
        finally:
            tenant_db.close()
        if tenant_engine is None:
            raise ValueError("Tenant database engine is not available")

        inspector = inspect(tenant_engine)
        available_tables = set(inspector.get_table_names())

        if dry_run:
            with tenant_engine.connect() as tenant_connection:
                transaction = tenant_connection.begin()
                try:
                    for table_name in self.PORTABLE_MINIMUM_TABLES:
                        if table_name not in table_payloads:
                            continue
                        if table_name not in available_tables:
                            summaries.append(
                                ImportedTableSummary(
                                    table_name=table_name,
                                    rows_in_package=len(table_payloads[table_name]),
                                    existing_rows=0,
                                    insertable_rows=0,
                                    inserted_rows=0,
                                    status="skipped",
                                    reason="target_table_missing",
                                )
                            )
                            continue
                        summaries.append(
                            self._import_table_rows(
                                tenant_connection=tenant_connection,
                                inspector=inspector,
                                table_name=table_name,
                                rows=table_payloads[table_name],
                                dry_run=True,
                            )
                        )
                    transaction.rollback()
                    return summaries
                except Exception:
                    transaction.rollback()
                    raise

        try:
            for table_name in self.PORTABLE_MINIMUM_TABLES:
                if table_name not in table_payloads:
                    continue
                if table_name not in available_tables:
                    summaries.append(
                        ImportedTableSummary(
                            table_name=table_name,
                            rows_in_package=len(table_payloads[table_name]),
                            existing_rows=0,
                            insertable_rows=0,
                            inserted_rows=0,
                            status="skipped",
                            reason="target_table_missing",
                        )
                    )
                    continue
                with tenant_engine.begin() as tenant_connection:
                    summaries.append(
                        self._import_table_rows(
                            tenant_connection=tenant_connection,
                            inspector=inspector,
                            table_name=table_name,
                            rows=table_payloads[table_name],
                            dry_run=False,
                        )
                    )
            return summaries
        except Exception:
            raise

    def _import_table_rows(
        self,
        *,
        tenant_connection,
        inspector,
        table_name: str,
        rows: list[dict[str, str]],
        dry_run: bool,
    ) -> ImportedTableSummary:
        pk_columns = inspector.get_pk_constraint(table_name).get("constrained_columns") or []
        if len(pk_columns) != 1:
            return ImportedTableSummary(
                table_name=table_name,
                rows_in_package=len(rows),
                existing_rows=0,
                insertable_rows=0,
                inserted_rows=0,
                status="skipped",
                reason="unsupported_primary_key",
            )
        pk_name = pk_columns[0]
        table_columns = {column["name"] for column in inspector.get_columns(table_name)}
        if pk_name not in table_columns:
            return ImportedTableSummary(
                table_name=table_name,
                rows_in_package=len(rows),
                existing_rows=0,
                insertable_rows=0,
                inserted_rows=0,
                status="skipped",
                reason="primary_key_missing",
            )

        reflected_table = Table(
            table_name,
            MetaData(),
            autoload_with=tenant_connection,
        )
        prepared_rows: list[dict[str, object]] = []
        existing_pk_values = {
            row[0] for row in tenant_connection.execute(select(reflected_table.c[pk_name]))
        }
        existing_rows = 0
        insertable_rows = 0
        for row in rows:
            if pk_name not in row or row.get(pk_name, "") == "":
                continue
            prepared = {
                column_name: self._deserialize_value(value)
                for column_name, value in row.items()
                if column_name in table_columns
            }
            if prepared[pk_name] in existing_pk_values:
                existing_rows += 1
                continue
            prepared_rows.append(prepared)
            insertable_rows += 1

        inserted_rows = 0
        if not dry_run and prepared_rows:
            tenant_connection.execute(reflected_table.insert(), prepared_rows)
            inserted_rows = len(prepared_rows)

        return ImportedTableSummary(
            table_name=table_name,
            rows_in_package=len(rows),
            existing_rows=existing_rows,
            insertable_rows=insertable_rows,
            inserted_rows=inserted_rows,
            status="dry_run" if dry_run else "applied",
        )

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

    def _deserialize_value(self, value):
        if value in ("", None):
            return None
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
