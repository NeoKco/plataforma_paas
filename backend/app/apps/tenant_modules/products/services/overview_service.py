from sqlalchemy import func

from app.apps.tenant_modules.crm.models import CRMProduct, CRMProductIngestionDraft, CRMProductIngestionRun


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
        }
