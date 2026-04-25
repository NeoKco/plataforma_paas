from __future__ import annotations

from datetime import datetime, timezone

from app.apps.platform_control.models.tenant import Tenant
from app.apps.platform_control.services.tenant_service import TenantService
from app.apps.tenant_modules.core.services.tenant_connection_service import TenantConnectionService
from app.apps.tenant_modules.products.models import ProductConnector
from app.apps.tenant_modules.products.services.connector_service import ProductConnectorService
from app.apps.tenant_modules.products.services.refresh_run_service import ProductCatalogRefreshRunService
from app.common.db.control_database import ControlSessionLocal


class ProductConnectorSchedulerService:
    def __init__(
        self,
        *,
        connector_service: ProductConnectorService | None = None,
        refresh_run_service: ProductCatalogRefreshRunService | None = None,
        tenant_connection_service: TenantConnectionService | None = None,
        tenant_service: TenantService | None = None,
    ) -> None:
        self._connector_service = connector_service or ProductConnectorService()
        self._refresh_run_service = refresh_run_service or ProductCatalogRefreshRunService()
        self._tenant_connection_service = tenant_connection_service or TenantConnectionService()
        self._tenant_service = tenant_service or TenantService()

    def list_due_connectors(self, tenant_db, *, limit: int = 50) -> list[ProductConnector]:
        now = self._now()
        return (
            tenant_db.query(ProductConnector)
            .filter(
                ProductConnector.is_active.is_(True),
                ProductConnector.schedule_enabled.is_(True),
                ProductConnector.schedule_scope == "due_sources",
                ProductConnector.next_scheduled_run_at.isnot(None),
                ProductConnector.next_scheduled_run_at <= now,
            )
            .order_by(
                ProductConnector.next_scheduled_run_at.asc(),
                ProductConnector.id.asc(),
            )
            .limit(max(int(limit or 50), 1))
            .all()
        )

    def run_connector_schedule_now(
        self,
        tenant_db,
        connector_id: int,
        *,
        actor_user_id: int | None = None,
    ):
        connector = self._connector_service.get_connector(tenant_db, connector_id)
        if not connector.is_active:
            raise ValueError("El conector está inactivo")
        payload = type(
            "RefreshRunPayload",
            (),
            {
                "scope": connector.schedule_scope or "due_sources",
                "connector_id": connector.id,
                "product_ids": [],
                "limit": connector.schedule_batch_limit or 50,
                "prefer_ai": bool(connector.run_ai_enrichment),
            },
        )()
        run = self._refresh_run_service.create_run(
            tenant_db,
            payload,
            actor_user_id=actor_user_id,
        )
        self._connector_service.touch_connector_schedule(
            tenant_db,
            connector.id,
            status="running",
            summary=f"scheduled_run:{run.id}",
        )
        tenant_db.commit()
        self._refresh_run_service._process_run(tenant_db, run.id)  # noqa: SLF001
        tenant_db.refresh(run)
        status = "warning" if run.error_count else "scheduled"
        summary = (
            f"run={run.id} processed={run.processed_count} completed={run.completed_count} "
            f"errors={run.error_count} cancelled={run.cancelled_count}"
        )
        self._connector_service.touch_connector_schedule(
            tenant_db,
            connector.id,
            status=status,
            summary=summary,
        )
        tenant_db.commit()
        tenant_db.refresh(run)
        return run

    def run_due_connector_schedules_for_tenant(self, tenant_db, *, limit: int = 20) -> dict:
        connectors = self.list_due_connectors(tenant_db, limit=limit)
        processed = 0
        launched = 0
        failed = 0
        items: list[dict] = []
        for connector in connectors:
            processed += 1
            try:
                run = self.run_connector_schedule_now(tenant_db, connector.id)
                launched += 1
                items.append(
                    {
                        "connector_id": connector.id,
                        "connector_name": connector.name,
                        "status": "launched",
                        "run_id": run.id,
                        "processed_count": run.processed_count,
                        "completed_count": run.completed_count,
                        "error_count": run.error_count,
                    }
                )
            except Exception as exc:  # noqa: BLE001
                failed += 1
                self._connector_service.touch_connector_schedule(
                    tenant_db,
                    connector.id,
                    status="error",
                    summary=str(exc)[:500],
                )
                tenant_db.commit()
                items.append(
                    {
                        "connector_id": connector.id,
                        "connector_name": connector.name,
                        "status": "error",
                        "error": str(exc),
                    }
                )
        return {
            "processed": processed,
            "launched": launched,
            "failed": failed,
            "items": items,
        }

    def run_due_connector_schedules_across_active_tenants(
        self,
        *,
        tenant_slug: str | None = None,
        tenant_limit: int = 100,
        connector_limit_per_tenant: int = 20,
    ) -> dict:
        control_db = ControlSessionLocal()
        tenant_db = None
        try:
            query = control_db.query(Tenant).filter(Tenant.status == "active").order_by(Tenant.id.asc())
            if tenant_slug:
                query = query.filter(Tenant.slug == tenant_slug)
            tenants = query.limit(max(int(tenant_limit or 100), 1)).all()
            processed = 0
            launched = 0
            skipped = 0
            failed = 0
            rows: list[dict] = []
            for tenant in tenants:
                modules = set(self._tenant_service.get_effective_enabled_modules(tenant) or ())
                if "all" not in modules and "products" not in modules:
                    skipped += 1
                    rows.append(
                        {
                            "tenant_slug": tenant.slug,
                            "status": "skipped_module_disabled",
                        }
                    )
                    continue
                processed += 1
                try:
                    tenant_session_factory = self._tenant_connection_service.get_tenant_session(tenant)
                    tenant_db = tenant_session_factory()
                    tenant_summary = self.run_due_connector_schedules_for_tenant(
                        tenant_db,
                        limit=connector_limit_per_tenant,
                    )
                    launched += int(tenant_summary["launched"] or 0)
                    failed += int(tenant_summary["failed"] or 0)
                    rows.append(
                        {
                            "tenant_slug": tenant.slug,
                            **tenant_summary,
                        }
                    )
                except Exception as exc:  # noqa: BLE001
                    failed += 1
                    rows.append(
                        {
                            "tenant_slug": tenant.slug,
                            "status": "error",
                            "error": str(exc),
                        }
                    )
                finally:
                    if tenant_db is not None:
                        tenant_db.close()
                        tenant_db = None
            return {
                "processed_tenants": processed,
                "launched_runs": launched,
                "skipped_tenants": skipped,
                "failed_tenants": failed,
                "tenants": rows,
            }
        finally:
            if tenant_db is not None:
                tenant_db.close()
            control_db.close()

    @staticmethod
    def _now() -> datetime:
        return datetime.now(timezone.utc)
