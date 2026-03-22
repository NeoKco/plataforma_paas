from sqlalchemy import create_engine


def create_postgres_engine(
    database_url: str,
    *,
    pool_size: int,
    max_overflow: int,
    pool_timeout_seconds: int,
    pool_recycle_seconds: int,
):
    return create_engine(
        database_url,
        pool_pre_ping=True,
        pool_size=pool_size,
        max_overflow=max_overflow,
        pool_timeout=pool_timeout_seconds,
        pool_recycle=pool_recycle_seconds,
    )
