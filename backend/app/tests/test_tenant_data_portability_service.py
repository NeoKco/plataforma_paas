import json
import tempfile
import unittest
from unittest.mock import patch
from zipfile import ZipFile

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.tests.fixtures import set_test_environment

set_test_environment()

from app.apps.platform_control.models.tenant import Tenant  # noqa: E402
from app.apps.platform_control.models.tenant_data_transfer_artifact import (  # noqa: E402,F401
    TenantDataTransferArtifact,
)
from app.apps.platform_control.models.tenant_data_transfer_job import (  # noqa: E402,F401
    TenantDataTransferJob,
)
from app.apps.platform_control.services.tenant_data_portability_service import (  # noqa: E402
    TenantDataPortabilityService,
)
from app.common.db.base import Base  # noqa: E402
from app.tests.db_test_utils import build_sqlite_session  # noqa: E402


class _FakeTenantConnectionService:
    def __init__(self, tenant_session_factories):
        self.tenant_session_factories = tenant_session_factories

    def get_tenant_session(self, tenant):
        return self.tenant_session_factories[tenant.id]


class TenantDataPortabilityServiceTestCase(unittest.TestCase):
    def setUp(self) -> None:
        self.control_db, self.control_engine = build_sqlite_session(Base)
        self.source_engine, self.source_session_factory = self._build_tenant_engine()
        self.target_engine, self.target_session_factory = self._build_tenant_engine()
        self._seed_source_database()
        self._seed_target_database()

        self.source_tenant = Tenant(
            name="Empresa Demo",
            slug="empresa-demo",
            tenant_type="empresa",
            status="active",
            db_name="tenant_empresa_demo",
            db_user="user_empresa_demo",
            db_host="127.0.0.1",
            db_port=5432,
            tenant_schema_version="0026",
        )
        self.target_tenant = Tenant(
            name="Empresa Nueva",
            slug="empresa-nueva",
            tenant_type="empresa",
            status="active",
            db_name="tenant_empresa_nueva",
            db_user="user_empresa_nueva",
            db_host="127.0.0.1",
            db_port=5432,
            tenant_schema_version="0026",
        )
        self.control_db.add(self.source_tenant)
        self.control_db.add(self.target_tenant)
        self.control_db.commit()
        self.control_db.refresh(self.source_tenant)
        self.control_db.refresh(self.target_tenant)

        self.service = TenantDataPortabilityService(
            tenant_connection_service=_FakeTenantConnectionService(
                {
                    self.source_tenant.id: self.source_session_factory,
                    self.target_tenant.id: self.target_session_factory,
                }
            )
        )

    def tearDown(self) -> None:
        self.control_db.close()
        self.control_engine.dispose()
        self.source_engine.dispose()
        self.target_engine.dispose()

    def _build_tenant_engine(self):
        engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        session_factory = sessionmaker(
            autocommit=False,
            autoflush=False,
            bind=engine,
        )
        return engine, session_factory

    def _seed_source_database(self) -> None:
        with self.source_engine.begin() as connection:
            connection.execute(
                text(
                    """
                    CREATE TABLE tenant_info (
                        id INTEGER PRIMARY KEY,
                        legal_name TEXT,
                        timezone TEXT
                    )
                    """
                )
            )
            connection.execute(
                text(
                    """
                    CREATE TABLE users (
                        id INTEGER PRIMARY KEY,
                        full_name TEXT,
                        email TEXT,
                        role TEXT
                    )
                    """
                )
            )
            connection.execute(
                text(
                    """
                    CREATE TABLE business_clients (
                        id INTEGER PRIMARY KEY,
                        legal_name TEXT,
                        tax_id TEXT
                    )
                    """
                )
            )
            connection.execute(
                text(
                    """
                    INSERT INTO tenant_info (id, legal_name, timezone)
                    VALUES (1, 'Empresa Demo', 'America/Santiago')
                    """
                )
            )
            connection.execute(
                text(
                    """
                    INSERT INTO users (id, full_name, email, role)
                    VALUES (1, 'Tenant Admin', 'admin@empresa-demo.local', 'admin')
                    """
                )
            )
            connection.execute(
                text(
                    """
                    INSERT INTO business_clients (id, legal_name, tax_id)
                    VALUES (1, 'Cliente Uno', '76.123.456-7')
                    """
                )
            )

    def _seed_target_database(self) -> None:
        with self.target_engine.begin() as connection:
            connection.execute(
                text(
                    """
                    CREATE TABLE tenant_info (
                        id INTEGER PRIMARY KEY,
                        legal_name TEXT,
                        timezone TEXT
                    )
                    """
                )
            )
            connection.execute(
                text(
                    """
                    CREATE TABLE users (
                        id INTEGER PRIMARY KEY,
                        full_name TEXT,
                        email TEXT,
                        role TEXT
                    )
                    """
                )
            )
            connection.execute(
                text(
                    """
                    CREATE TABLE business_clients (
                        id INTEGER PRIMARY KEY,
                        legal_name TEXT,
                        tax_id TEXT
                    )
                    """
                )
            )

    def _create_export_package(self, tmpdir: str):
        with patch(
            "app.apps.platform_control.services.tenant_data_portability_service.settings.TENANT_DATA_EXPORT_ARTIFACTS_DIR",
            tmpdir,
        ):
            job = self.service.create_export_job(
                self.control_db,
                tenant_id=self.source_tenant.id,
                requested_by_email="admin@platform.local",
            )
            _job, artifact, artifact_path = self.service.get_export_artifact(
                self.control_db,
                tenant_id=self.source_tenant.id,
                job_id=job.id,
            )
        return job, artifact, artifact_path

    def test_create_export_job_builds_zip_manifest_and_csv_files(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            job, artifact, artifact_path = self._create_export_package(tmpdir)
            persisted_job = self.service.get_export_job(
                self.control_db,
                tenant_id=self.source_tenant.id,
                job_id=job.id,
            )

            self.assertEqual(persisted_job.status, "completed")
            self.assertEqual(
                artifact.file_name,
                f"{self.source_tenant.slug}-portable-export-job-{job.id}.zip",
            )
            self.assertTrue(artifact_path.exists())

            with ZipFile(artifact_path, "r") as archive:
                names = set(archive.namelist())
                self.assertIn("manifest.json", names)
                self.assertIn("tenant_info.csv", names)
                self.assertIn("users.csv", names)
                self.assertIn("business_clients.csv", names)

                manifest = json.loads(archive.read("manifest.json").decode("utf-8"))
                self.assertEqual(manifest["tenant"]["slug"], "empresa-demo")
                self.assertEqual(manifest["export_scope"], "portable_minimum")
                exported_table_names = {item["table_name"] for item in manifest["tables"]}
                self.assertIn("tenant_info", exported_table_names)
                self.assertIn("users", exported_table_names)
                self.assertIn("business_clients", exported_table_names)
                self.assertIn("roles", set(manifest["skipped_tables"]))

    def test_create_import_job_dry_run_validates_without_writing_rows(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            _job, artifact, artifact_path = self._create_export_package(tmpdir)
            import_job = self.service.create_import_job(
                self.control_db,
                tenant_id=self.target_tenant.id,
                requested_by_email="admin@platform.local",
                package_bytes=artifact_path.read_bytes(),
                package_file_name=artifact.file_name,
                dry_run=True,
            )
            persisted_job = self.service.get_import_job(
                self.control_db,
                tenant_id=self.target_tenant.id,
                job_id=import_job.id,
            )

            summary = json.loads(persisted_job.summary_json or "{}")
            self.assertEqual(persisted_job.status, "completed")
            self.assertEqual(summary["mode"], "dry_run")
            self.assertEqual(summary["source_manifest"]["tenant_slug"], "empresa-demo")

            table_summaries = {
                item["table_name"]: item for item in summary["tables"]
            }
            self.assertEqual(table_summaries["users"]["insertable_rows"], 1)
            self.assertEqual(table_summaries["users"]["inserted_rows"], 0)

            target_db = self.target_session_factory()
            try:
                user_count = target_db.execute(text("SELECT COUNT(*) FROM users")).scalar()
                client_count = target_db.execute(
                    text("SELECT COUNT(*) FROM business_clients")
                ).scalar()
            finally:
                target_db.close()

            self.assertEqual(user_count, 0)
            self.assertEqual(client_count, 0)

    def test_create_import_job_apply_inserts_missing_rows(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            _job, artifact, artifact_path = self._create_export_package(tmpdir)
            import_job = self.service.create_import_job(
                self.control_db,
                tenant_id=self.target_tenant.id,
                requested_by_email="admin@platform.local",
                package_bytes=artifact_path.read_bytes(),
                package_file_name=artifact.file_name,
                dry_run=False,
            )
            persisted_job = self.service.get_import_job(
                self.control_db,
                tenant_id=self.target_tenant.id,
                job_id=import_job.id,
            )

            summary = json.loads(persisted_job.summary_json or "{}")
            table_summaries = {
                item["table_name"]: item for item in summary["tables"]
            }
            self.assertEqual(summary["mode"], "apply")
            self.assertEqual(table_summaries["users"]["inserted_rows"], 1)
            self.assertEqual(table_summaries["business_clients"]["inserted_rows"], 1)

            target_db = self.target_session_factory()
            try:
                user_count = target_db.execute(text("SELECT COUNT(*) FROM users")).scalar()
                client_count = target_db.execute(
                    text("SELECT COUNT(*) FROM business_clients")
                ).scalar()
            finally:
                target_db.close()

            self.assertEqual(user_count, 1)
            self.assertEqual(client_count, 1)

    def test_create_export_job_rejects_tenant_without_db_configuration(self) -> None:
        tenant = Tenant(
            name="Tenant Sin DB",
            slug="tenant-sin-db",
            tenant_type="empresa",
            status="active",
        )
        self.control_db.add(tenant)
        self.control_db.commit()
        self.control_db.refresh(tenant)

        with self.assertRaisesRegex(
            ValueError,
            "Tenant database configuration is incomplete",
        ):
            self.service.create_export_job(
                self.control_db,
                tenant_id=tenant.id,
                requested_by_email="admin@platform.local",
            )


if __name__ == "__main__":
    unittest.main()
