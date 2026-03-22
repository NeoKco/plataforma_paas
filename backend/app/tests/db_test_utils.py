import os
import uuid

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool


def build_sqlite_session(base) -> tuple[Session, object]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    base.metadata.create_all(bind=engine)
    session_local = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    return session_local(), engine


def get_postgres_test_config() -> dict | None:
    host = os.getenv("PGTEST_HOST")
    admin_user = os.getenv("PGTEST_ADMIN_USER")
    admin_password = os.getenv("PGTEST_ADMIN_PASSWORD")

    if not host or not admin_user or not admin_password:
        return None

    return {
        "host": host,
        "port": int(os.getenv("PGTEST_PORT", "5432")),
        "admin_db": os.getenv("PGTEST_ADMIN_DB", "postgres"),
        "admin_user": admin_user,
        "admin_password": admin_password,
    }


def build_postgres_session(base, db_prefix: str) -> tuple[Session, object, str]:
    config = get_postgres_test_config()
    if not config:
        raise RuntimeError("PGTEST_* no configurado")

    database_name = f"{db_prefix}_{uuid.uuid4().hex[:10]}"
    admin_url = (
        "postgresql+psycopg2://"
        f"{config['admin_user']}:{config['admin_password']}"
        f"@{config['host']}:{config['port']}/{config['admin_db']}"
    )
    admin_engine = create_engine(admin_url, isolation_level="AUTOCOMMIT")

    with admin_engine.connect() as conn:
        conn.execute(text(f'CREATE DATABASE "{database_name}"'))

    db_url = (
        "postgresql+psycopg2://"
        f"{config['admin_user']}:{config['admin_password']}"
        f"@{config['host']}:{config['port']}/{database_name}"
    )
    engine = create_engine(db_url, pool_pre_ping=True)
    base.metadata.create_all(bind=engine)
    session_local = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    return session_local(), engine, database_name


def drop_postgres_database(database_name: str) -> None:
    config = get_postgres_test_config()
    if not config:
        return

    admin_url = (
        "postgresql+psycopg2://"
        f"{config['admin_user']}:{config['admin_password']}"
        f"@{config['host']}:{config['port']}/{config['admin_db']}"
    )
    admin_engine = create_engine(admin_url, isolation_level="AUTOCOMMIT")

    with admin_engine.connect() as conn:
        conn.execute(
            text(
                "SELECT pg_terminate_backend(pid) "
                "FROM pg_stat_activity "
                "WHERE datname = :database_name AND pid <> pg_backend_pid()"
            ),
            {"database_name": database_name},
        )
        conn.execute(text(f'DROP DATABASE IF EXISTS "{database_name}"'))
