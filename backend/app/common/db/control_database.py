from sqlalchemy.orm import sessionmaker

from app.common.config.settings import settings
from app.common.db.engine_factory import create_postgres_engine


control_engine = create_postgres_engine(
    settings.control_database_url,
    pool_size=settings.CONTROL_DB_POOL_SIZE,
    max_overflow=settings.CONTROL_DB_MAX_OVERFLOW,
    pool_timeout_seconds=settings.CONTROL_DB_POOL_TIMEOUT_SECONDS,
    pool_recycle_seconds=settings.CONTROL_DB_POOL_RECYCLE_SECONDS,
)

ControlSessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=control_engine,
)
