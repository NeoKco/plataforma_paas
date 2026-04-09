import json
from pathlib import Path
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
    def __init__(self, tenant_session_factory):
        self.tenant_session_factory = tenant_session_factory

    def get_tenant_session(self, tenant):
        return self.tenant_session_factory


class TenantDataPortabilityServiceTestCase(unittest.TestCase):
    def setUp(self) -> None:
        self.control_db, self.control_engine = build_sqlite_session(Base)
        self.tenant_engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        self.tenant_session_factory = sessionmaker(
            autocommit=False,
            autoflush=False,
            bind=self.tenant_engine,
        )
        with self.tenant_engine.begin() as connection:
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

        self.tenant = Tenant(
            name="Empresa Demo",
            slug="empresa-demo",
            tenant_type="empresa",
            status="active",
            db_name="tenant_empresa_demo",
            db_user="user_empresa_demo",
            db_host="127.0.0.1",
            db_port=5432,
        )
        self.control_db.add(self.tenant)
        self.control_db.commit()
        self.control_db.refresh(self.tenant)

    def tearDown(self) -> None:
        self.control_db.close()
        self.control_engine.dispose()
        self.tenant_engine.dispose()

    def test_create_export_job_builds_zip_manifest_and_csv_files(self) -> None:
        service = TenantDataPortabilityService(
            tenant_connection_service=_FakeTenantConnectionService(
                self.tenant_session_factory
            )
        )

        with tempfile.TemporaryDirectory() as tmpdir, patch(
            "app.apps.platform_control.services.tenant_data_portability_service.settings.TENANT_DATA_EXPORT_ARTIFACTS_DIR",
            tmpdir,
        ):
            job = service.create_export_job(
                self.control_db,
                tenant_id=self.tenant.id,
                requested_by_email="admin@platform.local",
            )
            persisted_job = service.get_export_job(
                self.control_db,
                tenant_id=self.tenant.id,
                job_id=job.id,
            )
            _job, artifact, artifact_path = service.get_export_artifact(
                self.control_db,
                tenant_id=self.tenant.id,
                job_id=job.id,
            )

            self.assertEqual(persisted_job.status, "completed")
            self.assertEqual(artifact.file_name, f"{self.tenant.slug}-portable-export-job-{job.id}.zip")
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
                exported_table_names = {
                    item["table_name"] for item in manifest["tables"]
                }
                self.assertIn("tenant_info", exported_table_names)
                self.assertIn("users", exported_table_names)
                self.assertIn("business_clients", exported_table_names)
                self.assertIn("roles", set(manifest["skipped_tables"]))

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

        service = TenantDataPortabilityService(
            tenant_connection_service=_FakeTenantConnectionService(
                self.tenant_session_factory
            )
        )

        with self.assertRaisesRegex(
            ValueError,
            "Tenant database configuration is incomplete",
        ):
            service.create_export_job(
                self.control_db,
                tenant_id=tenant.id,
                requested_by_email="admin@platform.local",
            )


if __name__ == "__main__":
    unittest.main()
