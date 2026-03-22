from sqlalchemy import create_engine, text
from sqlalchemy.engine import URL


class PostgresBootstrapService:
    def __init__(
        self,
        admin_host: str,
        admin_port: int,
        admin_db_name: str,
        admin_user: str,
        admin_password: str,
    ) -> None:
        self.admin_url = URL.create(
            drivername="postgresql+psycopg2",
            username=admin_user,
            password=admin_password,
            host=admin_host,
            port=admin_port,
            database=admin_db_name,
        )

    def _get_engine(self):
        return create_engine(
            self.admin_url,
            isolation_level="AUTOCOMMIT",
            pool_pre_ping=True,
        )

    def validate_connection(self) -> None:
        engine = self._get_engine()
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))

    def role_exists(self, role_name: str) -> bool:
        engine = self._get_engine()
        with engine.connect() as conn:
            result = conn.execute(
                text("SELECT 1 FROM pg_roles WHERE rolname = :role_name"),
                {"role_name": role_name},
            )
            return result.scalar() is not None

    def database_exists(self, db_name: str) -> bool:
        engine = self._get_engine()
        with engine.connect() as conn:
            result = conn.execute(
                text("SELECT 1 FROM pg_database WHERE datname = :db_name"),
                {"db_name": db_name},
            )
            return result.scalar() is not None

    def create_role_if_not_exists(self, role_name: str, role_password: str) -> None:
        if self.role_exists(role_name):
            return

        engine = self._get_engine()
        sql = text(f'CREATE ROLE "{role_name}" WITH LOGIN PASSWORD :role_password')
        with engine.connect() as conn:
            conn.execute(sql, {"role_password": role_password})

    def create_database_if_not_exists(self, db_name: str, owner_name: str) -> None:
        if self.database_exists(db_name):
            return

        engine = self._get_engine()
        sql = text(f'CREATE DATABASE "{db_name}" OWNER "{owner_name}"')
        with engine.connect() as conn:
            conn.execute(sql)

    def bootstrap_control_database(
        self,
        control_db_name: str,
        control_db_user: str,
        control_db_password: str,
    ) -> None:
        self.validate_connection()
        self.create_role_if_not_exists(control_db_user, control_db_password)
        self.create_database_if_not_exists(control_db_name, control_db_user)