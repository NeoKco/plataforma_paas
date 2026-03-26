from app.common.db.migration_service import (
    get_tenant_migration_status,
    run_tenant_migrations,
)


class TenantSchemaService:
    def get_schema_status(
        self,
        host: str,
        port: int,
        database: str,
        username: str,
        password: str,
    ) -> dict:
        return get_tenant_migration_status(
            host=host,
            port=port,
            database=database,
            username=username,
            password=password,
        )

    def sync_schema(
        self,
        host: str,
        port: int,
        database: str,
        username: str,
        password: str,
    ) -> dict:
        applied_now = run_tenant_migrations(
            host=host,
            port=port,
            database=database,
            username=username,
            password=password,
        )
        status = self.get_schema_status(
            host=host,
            port=port,
            database=database,
            username=username,
            password=password,
        )
        status["applied_now"] = applied_now
        return status
