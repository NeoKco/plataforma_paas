from sqlalchemy import func

from app.apps.tenant_modules.crm.models import CRMProduct, CRMProductIngestionDraft, CRMProductIngestionRun
from app.apps.tenant_modules.products.models import (
    ProductConnector,
    ProductPriceHistory,
    ProductRefreshRun,
    ProductSource,
)


class ProductCatalogOverviewService:
    def build_overview(self, tenant_db) -> dict:
        product_total = tenant_db.query(func.count(CRMProduct.id)).scalar() or 0
        product_active = (
            tenant_db.query(func.count(CRMProduct.id))
            .filter(CRMProduct.is_active.is_(True))
            .scalar()
            or 0
        )
        ingestion_total = tenant_db.query(func.count(CRMProductIngestionDraft.id)).scalar() or 0
        ingestion_draft = (
            tenant_db.query(func.count(CRMProductIngestionDraft.id))
            .filter(CRMProductIngestionDraft.capture_status == "draft")
            .scalar()
            or 0
        )
        approved_total = (
            tenant_db.query(func.count(CRMProductIngestionDraft.id))
            .filter(CRMProductIngestionDraft.capture_status == "approved")
            .scalar()
            or 0
        )
        discarded_total = (
            tenant_db.query(func.count(CRMProductIngestionDraft.id))
            .filter(CRMProductIngestionDraft.capture_status == "discarded")
            .scalar()
            or 0
        )
        url_source_total = (
            tenant_db.query(func.count(CRMProductIngestionDraft.id))
            .filter(func.coalesce(CRMProductIngestionDraft.source_url, "") != "")
            .scalar()
            or 0
        )
        run_total = tenant_db.query(func.count(CRMProductIngestionRun.id)).scalar() or 0
        run_active = (
            tenant_db.query(func.count(CRMProductIngestionRun.id))
            .filter(CRMProductIngestionRun.status.in_(("queued", "running")))
            .scalar()
            or 0
        )
        source_total = tenant_db.query(func.count(ProductSource.id)).scalar() or 0
        source_active = (
            tenant_db.query(func.count(ProductSource.id))
            .filter(ProductSource.source_status == "active")
            .scalar()
            or 0
        )
        price_event_total = tenant_db.query(func.count(ProductPriceHistory.id)).scalar() or 0
        connector_total = tenant_db.query(func.count(ProductConnector.id)).scalar() or 0
        connector_active = (
            tenant_db.query(func.count(ProductConnector.id))
            .filter(ProductConnector.is_active.is_(True))
            .scalar()
            or 0
        )
        connector_scheduled = (
            tenant_db.query(func.count(ProductConnector.id))
            .filter(
                ProductConnector.is_active.is_(True),
                ProductConnector.schedule_enabled.is_(True),
            )
            .scalar()
            or 0
        )
        connector_schedule_due = (
            tenant_db.query(func.count(ProductConnector.id))
            .filter(
                ProductConnector.is_active.is_(True),
                ProductConnector.schedule_enabled.is_(True),
                ProductConnector.next_scheduled_run_at.isnot(None),
                ProductConnector.next_scheduled_run_at <= func.now(),
            )
            .scalar()
            or 0
        )
        products_with_source = (
            tenant_db.query(func.count(func.distinct(ProductSource.product_id))).scalar() or 0
        )
        multi_source_subquery = (
            tenant_db.query(ProductSource.product_id)
            .group_by(ProductSource.product_id)
            .having(func.count(ProductSource.id) >= 2)
            .subquery()
        )
        products_with_multi_source = (
            tenant_db.query(func.count())
            .select_from(multi_source_subquery)
            .scalar()
            or 0
        )
        refresh_run_total = tenant_db.query(func.count(ProductRefreshRun.id)).scalar() or 0
        refresh_run_active = (
            tenant_db.query(func.count(ProductRefreshRun.id))
            .filter(ProductRefreshRun.status.in_(("queued", "running")))
            .scalar()
            or 0
        )
        source_due = (
            tenant_db.query(func.count(ProductSource.id))
            .filter(
                ProductSource.refresh_mode != "manual",
                ProductSource.next_refresh_at.isnot(None),
                ProductSource.next_refresh_at <= func.now(),
            )
            .scalar()
            or 0
        )
        source_error = (
            tenant_db.query(func.count(ProductSource.id))
            .filter(ProductSource.sync_status == "error")
            .scalar()
            or 0
        )
        return {
            "products_total": int(product_total),
            "products_active": int(product_active),
            "ingestion_total": int(ingestion_total),
            "ingestion_draft": int(ingestion_draft),
            "approved_total": int(approved_total),
            "discarded_total": int(discarded_total),
            "url_source_total": int(url_source_total),
            "run_total": int(run_total),
            "run_active": int(run_active),
            "source_total": int(source_total),
            "source_active": int(source_active),
            "price_event_total": int(price_event_total),
            "connector_total": int(connector_total),
            "connector_active": int(connector_active),
            "connector_scheduled": int(connector_scheduled),
            "connector_schedule_due": int(connector_schedule_due),
            "products_with_source": int(products_with_source),
            "products_with_multi_source": int(products_with_multi_source),
            "refresh_run_total": int(refresh_run_total),
            "refresh_run_active": int(refresh_run_active),
            "source_due": int(source_due),
            "source_error": int(source_error),
        }
