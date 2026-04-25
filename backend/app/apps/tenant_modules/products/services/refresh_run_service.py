from __future__ import annotations

import json
from datetime import datetime, timezone

from app.apps.platform_control.models.tenant import Tenant
from app.apps.tenant_modules.core.services.tenant_connection_service import TenantConnectionService
from app.apps.tenant_modules.products.models import ProductRefreshRun, ProductRefreshRunItem, ProductSource
from app.apps.tenant_modules.products.services.connector_service import ProductConnectorService
from app.apps.tenant_modules.products.services.refresh_service import ProductCatalogRefreshService
from app.common.db.control_database import ControlSessionLocal


class ProductCatalogRefreshRunService:
    VALID_RUN_STATUSES = {"queued", "running", "completed", "cancelled", "failed"}
    VALID_ITEM_STATUSES = {"queued", "processing", "completed", "error", "cancelled"}
    VALID_SCOPES = {"due_sources", "active_sources", "selected_products"}

    def __init__(
        self,
        *,
        refresh_service: ProductCatalogRefreshService | None = None,
        tenant_connection_service: TenantConnectionService | None = None,
    ) -> None:
        self._refresh_service = refresh_service or ProductCatalogRefreshService()
        self._connector_service = ProductConnectorService()
        self._tenant_connection_service = tenant_connection_service or TenantConnectionService()

    def list_runs(self, tenant_db) -> list[ProductRefreshRun]:
        return (
            tenant_db.query(ProductRefreshRun)
            .order_by(ProductRefreshRun.created_at.desc(), ProductRefreshRun.id.desc())
            .all()
        )

    def get_run(self, tenant_db, run_id: int) -> ProductRefreshRun:
        run = tenant_db.get(ProductRefreshRun, run_id)
        if run is None:
            raise ValueError("Corrida de actualización no encontrada")
        return run

    def get_run_item_map(self, tenant_db, run_ids: list[int]) -> dict[int, list[ProductRefreshRunItem]]:
        normalized_ids = [item for item in run_ids if item]
        if not normalized_ids:
            return {}
        rows = (
            tenant_db.query(ProductRefreshRunItem)
            .filter(ProductRefreshRunItem.run_id.in_(normalized_ids))
            .order_by(ProductRefreshRunItem.id.asc())
            .all()
        )
        grouped: dict[int, list[ProductRefreshRunItem]] = {}
        for row in rows:
            grouped.setdefault(row.run_id, []).append(row)
        return grouped

    def create_run(self, tenant_db, payload, *, actor_user_id: int | None = None) -> ProductRefreshRun:
        scope = (payload.scope or "due_sources").strip().lower()
        if scope not in self.VALID_SCOPES:
            raise ValueError("Alcance de actualización inválido")
        connector = self._connector_service.get_connector(tenant_db, payload.connector_id) if payload.connector_id else None
        sources = self._select_sources(
            tenant_db,
            scope=scope,
            connector_id=connector.id if connector else None,
            product_ids=payload.product_ids,
            limit=payload.limit,
        )
        if not sources:
            raise ValueError("No hay fuentes elegibles para esta corrida de actualización")

        run = ProductRefreshRun(
            status="queued",
            scope=scope,
            scope_label=self._build_scope_label(scope, connector_name=getattr(connector, "name", None)),
            connector_id=connector.id if connector else None,
            requested_count=len(sources),
            processed_count=0,
            completed_count=0,
            error_count=0,
            cancelled_count=0,
            created_by_user_id=actor_user_id,
            prefer_ai=bool(payload.prefer_ai),
            started_at=None,
            finished_at=None,
            cancelled_at=None,
            last_error=None,
        )
        tenant_db.add(run)
        tenant_db.flush()
        for source in sources:
            tenant_db.add(
                ProductRefreshRunItem(
                    run_id=run.id,
                    product_id=source.product_id,
                    product_source_id=source.id,
                    item_status="queued",
                    source_url=source.source_url,
                    source_label=source.source_label,
                    merge_policy=source.refresh_merge_policy or "safe_merge",
                    used_ai_enrichment=bool(payload.prefer_ai),
                    detected_changes_json=None,
                    error_message=None,
                    processed_at=None,
                )
            )
        tenant_db.commit()
        tenant_db.refresh(run)
        return run

    def cancel_run(self, tenant_db, run_id: int) -> ProductRefreshRun:
        run = self.get_run(tenant_db, run_id)
        if run.status in {"completed", "failed"}:
            raise ValueError("La corrida ya terminó y no puede cancelarse")
        run.status = "cancelled"
        run.cancelled_at = self._now()
        run.updated_at = self._now()
        tenant_db.add(run)
        tenant_db.commit()
        tenant_db.refresh(run)
        return run

    def process_run_background(self, tenant_slug: str, run_id: int) -> None:
        control_db = ControlSessionLocal()
        tenant_db = None
        try:
            tenant = self._tenant_connection_service.get_tenant_by_slug(control_db, tenant_slug)
            if tenant is None:
                return
            tenant_session_factory = self._tenant_connection_service.get_tenant_session(tenant)
            tenant_db = tenant_session_factory()
            self._process_run(tenant_db, run_id)
        finally:
            if tenant_db is not None:
                tenant_db.close()
            control_db.close()

    def _process_run(self, tenant_db, run_id: int) -> None:
        run = self.get_run(tenant_db, run_id)
        if run.status in {"completed", "failed"}:
            return
        if run.status != "cancelled":
            run.status = "running"
            run.started_at = run.started_at or self._now()
            run.updated_at = self._now()
            tenant_db.add(run)
            tenant_db.commit()

        items = self.get_run_item_map(tenant_db, [run_id]).get(run_id, [])
        for item in items:
            tenant_db.refresh(run)
            if run.status == "cancelled":
                self._cancel_remaining_items(tenant_db, run_id)
                self._refresh_run_totals(tenant_db, run_id)
                self._finalize_run(tenant_db, run_id)
                return
            if item.item_status not in {"queued", "error"}:
                continue
            item.item_status = "processing"
            item.updated_at = self._now()
            tenant_db.add(item)
            tenant_db.commit()

            try:
                product, result = self._refresh_service.refresh_product(
                    tenant_db,
                    item.product_id,
                    prefer_ai=bool(run.prefer_ai or item.used_ai_enrichment),
                    source_ids=[item.product_source_id] if item.product_source_id else None,
                )
                item.item_status = "completed"
                item.detected_changes_json = json.dumps(
                    {
                        "changed_fields": result.get("changed_fields") or [],
                        "merge_policies": result.get("merge_policies") or [],
                    },
                    ensure_ascii=True,
                    sort_keys=True,
                )
                item.error_message = None
                item.processed_at = self._now()
                item.updated_at = self._now()
                tenant_db.add(item)
                tenant_db.commit()
                tenant_db.refresh(product)
            except Exception as exc:  # noqa: BLE001
                item.item_status = "error"
                item.error_message = str(exc)[:4000]
                item.processed_at = self._now()
                item.updated_at = self._now()
                tenant_db.add(item)
                tenant_db.commit()

            self._refresh_run_totals(tenant_db, run_id)

        self._finalize_run(tenant_db, run_id)

    def _select_sources(
        self,
        tenant_db,
        *,
        scope: str,
        connector_id: int | None,
        product_ids: list[int] | None,
        limit: int,
    ) -> list[ProductSource]:
        query = tenant_db.query(ProductSource).filter(
            ProductSource.source_status.in_(("active", "stale")),
            ProductSource.source_url.isnot(None),
        )
        if connector_id:
            query = query.filter(ProductSource.connector_id == connector_id)
        if scope == "selected_products":
            normalized_ids = [item for item in (product_ids or []) if item]
            if not normalized_ids:
                raise ValueError("Debes seleccionar productos para la corrida")
            query = query.filter(ProductSource.product_id.in_(normalized_ids))
        elif scope == "due_sources":
            query = query.filter(ProductSource.refresh_mode != "manual").filter(
                (ProductSource.next_refresh_at.is_(None)) | (ProductSource.next_refresh_at <= self._now())
            )
        return (
            query.order_by(
                ProductSource.next_refresh_at.asc(),
                ProductSource.id.asc(),
            )
            .limit(max(int(limit or 100), 1))
            .all()
        )

    def _cancel_remaining_items(self, tenant_db, run_id: int) -> None:
        rows = self.get_run_item_map(tenant_db, [run_id]).get(run_id, [])
        for item in rows:
            if item.item_status == "queued":
                item.item_status = "cancelled"
                item.processed_at = self._now()
                tenant_db.add(item)
        tenant_db.commit()

    def _refresh_run_totals(self, tenant_db, run_id: int) -> ProductRefreshRun:
        run = self.get_run(tenant_db, run_id)
        items = self.get_run_item_map(tenant_db, [run_id]).get(run_id, [])
        run.processed_count = sum(1 for item in items if item.item_status in {"completed", "error", "cancelled"})
        run.completed_count = sum(1 for item in items if item.item_status == "completed")
        run.error_count = sum(1 for item in items if item.item_status == "error")
        run.cancelled_count = sum(1 for item in items if item.item_status == "cancelled")
        if run.error_count:
            error_item = next((item for item in reversed(items) if item.error_message), None)
            run.last_error = error_item.error_message if error_item else run.last_error
        run.updated_at = self._now()
        tenant_db.add(run)
        tenant_db.commit()
        tenant_db.refresh(run)
        return run

    def _finalize_run(self, tenant_db, run_id: int) -> ProductRefreshRun:
        run = self._refresh_run_totals(tenant_db, run_id)
        items = self.get_run_item_map(tenant_db, [run_id]).get(run_id, [])
        if run.status == "cancelled":
            run.finished_at = self._now()
        elif items and all(item.item_status in {"completed", "error", "cancelled"} for item in items):
            run.status = "completed" if run.completed_count > 0 or run.error_count == 0 else "failed"
            run.finished_at = self._now()
        run.updated_at = self._now()
        tenant_db.add(run)
        tenant_db.commit()
        tenant_db.refresh(run)
        return run

    @staticmethod
    def _build_scope_label(scope: str, *, connector_name: str | None) -> str:
        if scope == "active_sources":
            return "Fuentes activas"
        if scope == "selected_products":
            return "Productos seleccionados"
        if connector_name:
            return f"Fuentes vencidas - {connector_name}"
        return "Fuentes vencidas"

    @staticmethod
    def _now() -> datetime:
        return datetime.now(timezone.utc)
