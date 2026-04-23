from sqlalchemy import func

from app.apps.tenant_modules.crm.models import CRMOpportunity, CRMProduct, CRMQuote


class CRMOverviewService:
    def build_overview(self, tenant_db) -> dict:
        product_total = tenant_db.query(func.count(CRMProduct.id)).scalar() or 0
        product_active = (
            tenant_db.query(func.count(CRMProduct.id))
            .filter(CRMProduct.is_active.is_(True))
            .scalar()
            or 0
        )
        opportunity_total = tenant_db.query(func.count(CRMOpportunity.id)).scalar() or 0
        pipeline_value = (
            tenant_db.query(func.coalesce(func.sum(CRMOpportunity.expected_value), 0))
            .filter(CRMOpportunity.is_active.is_(True))
            .scalar()
            or 0
        )
        quote_total = tenant_db.query(func.count(CRMQuote.id)).scalar() or 0
        quote_amount = (
            tenant_db.query(func.coalesce(func.sum(CRMQuote.total_amount), 0))
            .filter(CRMQuote.is_active.is_(True))
            .scalar()
            or 0
        )
        return {
            "products_total": int(product_total),
            "products_active": int(product_active),
            "opportunities_total": int(opportunity_total),
            "pipeline_value": float(pipeline_value),
            "quotes_total": int(quote_total),
            "quoted_amount": float(quote_amount),
        }
