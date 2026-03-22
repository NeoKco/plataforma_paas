from app.common.db.migration_service import run_tenant_migrations


class TenantSchemaService:
    def sync_schema(
        self,
        host: str,
        port: int,
        database: str,
        username: str,
        password: str,
    ) -> None:
        run_tenant_migrations(
            host=host,
            port=port,
            database=database,
            username=username,
            password=password,
        )
