import importlib
import pkgutil

from sqlalchemy import Column, DateTime, MetaData, String, Table, func, select
from sqlalchemy.engine import Engine


class MigrationRunner:
    def __init__(
        self,
        engine: Engine,
        package_name: str,
        table_name: str,
    ):
        self.engine = engine
        self.package_name = package_name
        self.table_name = table_name
        self.metadata = MetaData()
        self.migration_table = Table(
            table_name,
            self.metadata,
            Column("version", String(100), primary_key=True),
            Column("description", String(255), nullable=False),
            Column(
                "applied_at",
                DateTime(timezone=True),
                server_default=func.now(),
                nullable=False,
            ),
        )

    def apply_pending(self) -> list[str]:
        applied_versions = self._get_applied_versions()
        migrations = self._load_migrations()
        applied_now: list[str] = []

        with self.engine.begin() as conn:
            self.migration_table.create(bind=conn, checkfirst=True)

            for migration in migrations:
                if migration.MIGRATION_ID in applied_versions:
                    continue

                migration.upgrade(conn)
                conn.execute(
                    self.migration_table.insert().values(
                        version=migration.MIGRATION_ID,
                        description=migration.DESCRIPTION,
                    )
                )
                applied_now.append(migration.MIGRATION_ID)

        return applied_now

    def get_applied_versions(self) -> list[str]:
        return sorted(self._get_applied_versions())

    def _get_applied_versions(self) -> set[str]:
        with self.engine.begin() as conn:
            self.migration_table.create(bind=conn, checkfirst=True)
            rows = conn.execute(select(self.migration_table.c.version)).all()
            return {row[0] for row in rows}

    def _load_migrations(self) -> list[object]:
        package = importlib.import_module(self.package_name)
        modules = []

        for module_info in pkgutil.iter_modules(package.__path__):
            if module_info.name.startswith("__"):
                continue

            module = importlib.import_module(f"{self.package_name}.{module_info.name}")
            modules.append(module)

        modules.sort(key=lambda module: module.MIGRATION_ID)
        return modules
