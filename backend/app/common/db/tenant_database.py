from sqlalchemy.orm import sessionmaker

from app.common.config.settings import settings
from app.common.db.engine_factory import create_postgres_engine


def build_tenant_database_url(
    host: str,
    port: int,
    database: str,
    username: str,
    password: str,
) -> str:
    return (
        f"postgresql+psycopg2://"
        f"{username}:{password}"
        f"@{host}:{port}/{database}"
    )


def get_tenant_session_factory(
    host: str,
    port: int,
    database: str,
    username: str,
    password: str,
):
    database_url = build_tenant_database_url(
        host=host,
        port=port,
        database=database,
        username=username,
        password=password,
    )

    engine = create_postgres_engine(
        database_url,
        pool_size=settings.TENANT_DB_POOL_SIZE,
        max_overflow=settings.TENANT_DB_MAX_OVERFLOW,
        pool_timeout_seconds=settings.TENANT_DB_POOL_TIMEOUT_SECONDS,
        pool_recycle_seconds=settings.TENANT_DB_POOL_RECYCLE_SECONDS,
    )

    return sessionmaker(
        autocommit=False,
        autoflush=False,
        bind=engine,
    )
