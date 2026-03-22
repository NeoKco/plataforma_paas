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
    return runner.apply_pending()
