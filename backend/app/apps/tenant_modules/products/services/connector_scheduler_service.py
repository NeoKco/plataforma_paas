from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import func

from app.apps.platform_control.models.tenant import Tenant
from app.apps.platform_control.services.tenant_service import TenantService
from app.apps.tenant_modules.core.services.tenant_connection_service import TenantConnectionService
from app.apps.tenant_modules.products.models import ProductConnector, ProductRefreshRun, ProductSource
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

    def build_due_source_count_map(self, tenant_db, connector_ids: list[int]) -> dict[int, int]:
        normalized_ids = [item for item in connector_ids if item]
        if not normalized_ids:
            return {}
        now = self._now()
        rows = (
            tenant_db.query(ProductSource.connector_id, func.count(ProductSource.id))
            .filter(
                ProductSource.connector_id.in_(normalized_ids),
                ProductSource.source_status.in_(("active", "stale")),
                ProductSource.refresh_mode != "manual",
                ProductSource.source_url.isnot(None),
                (ProductSource.next_refresh_at.is_(None)) | (ProductSource.next_refresh_at <= now),
            )
            .group_by(ProductSource.connector_id)
            .all()
        )
        return {
            int(connector_id): int(total or 0)
            for connector_id, total in rows
            if connector_id
        }

    def list_recent_scheduled_runs(self, tenant_db, *, limit: int = 10) -> list[ProductRefreshRun]:
        return (
            tenant_db.query(ProductRefreshRun)
            .filter(
                ProductRefreshRun.scope == "due_sources",
                ProductRefreshRun.connector_id.isnot(None),
            )
            .order_by(ProductRefreshRun.created_at.desc(), ProductRefreshRun.id.desc())
            .limit(max(int(limit or 10), 1))
            .all()
        )

    def build_scheduler_overview(
        self,
        tenant_db,
        *,
        connector_limit: int = 20,
        run_limit: int = 10,
    ) -> dict:
        connectors = self.list_due_connectors(tenant_db, limit=connector_limit)
        due_map = self.build_due_source_count_map(tenant_db, [item.id for item in connectors])
        recent_runs = self.list_recent_scheduled_runs(tenant_db, limit=run_limit)
        return {
            "due_total": len(connectors),
            "due_connectors": connectors,
            "due_source_count_map": due_map,
            "recent_runs": recent_runs,
        }

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

    def run_due_connector_schedules_for_tenant(
        self,
        tenant_db,
        *,
        limit: int = 20,
        actor_user_id: int | None = None,
    ) -> dict:
        connectors = self.list_due_connectors(tenant_db, limit=limit)
        processed = 0
        launched = 0
        failed = 0
        items: list[dict] = []
        for connector in connectors:
            processed += 1
            try:
                run = self.run_connector_schedule_now(
                    tenant_db,
                    connector.id,
                    actor_user_id=actor_user_id,
                )
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
        dry_run: bool = False,
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
                    if dry_run:
                        preview = self.build_scheduler_overview(
                            tenant_db,
                            connector_limit=connector_limit_per_tenant,
                            run_limit=5,
                        )
                        rows.append(
                            {
                                "tenant_slug": tenant.slug,
                                "status": "preview",
                                "due_total": preview["due_total"],
                                "due_connectors": [
                                    {
                                        "connector_id": item.id,
                                        "connector_name": item.name,
                                        "provider_key": getattr(item, "provider_key", "generic"),
                                        "next_scheduled_run_at": item.next_scheduled_run_at.isoformat()
                                        if item.next_scheduled_run_at
                                        else None,
                                        "due_source_count": preview["due_source_count_map"].get(item.id, 0),
                                    }
                                    for item in preview["due_connectors"]
                                ],
                            }
                        )
                    else:
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
                "dry_run": bool(dry_run),
                "tenants": rows,
            }
        finally:
            if tenant_db is not None:
                tenant_db.close()
            control_db.close()

    @staticmethod
    def _now() -> datetime:
        return datetime.now(timezone.utc)
