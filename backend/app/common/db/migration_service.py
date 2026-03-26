from sqlalchemy import create_engine

from app.common.db.control_database import control_engine
from app.common.db.migration_runner import MigrationRunner


CONTROL_MIGRATION_TABLE = "control_schema_migrations"
TENANT_MIGRATION_TABLE = "tenant_schema_migrations"


def run_control_migrations() -> list[str]:
    runner = MigrationRunner(
        engine=control_engine,
        package_name="migrations.control",
        table_name=CONTROL_MIGRATION_TABLE,
    )
    return runner.apply_pending()


def run_tenant_migrations(
    host: str,
    port: int,
    database: str,
    username: str,
    password: str,
) -> list[str]:
    engine = create_engine(
        f"postgresql+psycopg2://{username}:{password}@{host}:{port}/{database}",
        pool_pre_ping=True,
    )
    runner = MigrationRunner(
        engine=engine,
        package_name="migrations.tenant",
        table_name=TENANT_MIGRATION_TABLE,
    )
    try:
        return runner.apply_pending()
    finally:
        engine.dispose()


def get_tenant_migration_status(
    host: str,
    port: int,
    database: str,
    username: str,
    password: str,
) -> dict:
    engine = create_engine(
        f"postgresql+psycopg2://{username}:{password}@{host}:{port}/{database}",
        pool_pre_ping=True,
    )
    runner = MigrationRunner(
        engine=engine,
        package_name="migrations.tenant",
        table_name=TENANT_MIGRATION_TABLE,
    )
    try:
        applied_rows = runner.get_applied_migrations()
        applied_versions = [row["version"] for row in applied_rows]
        available_versions = runner.get_available_versions()
        latest_available_version = runner.get_latest_available_version()
        pending_versions = [
            version for version in available_versions if version not in set(applied_versions)
        ]
        return {
            "current_version": None if not applied_versions else applied_versions[-1],
            "latest_available_version": latest_available_version,
            "applied_versions": applied_versions,
            "pending_versions": pending_versions,
            "pending_count": len(pending_versions),
            "last_applied_at": (
                None if not applied_rows else applied_rows[-1]["applied_at"]
            ),
        }
    finally:
        engine.dispose()
