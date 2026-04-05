from sqlalchemy import func
from sqlalchemy.orm import Session

from app.apps.tenant_modules.business_core.models import BusinessAsset
from app.apps.tenant_modules.business_core.repositories.catalog_repository import BusinessCoreCatalogRepository


class BusinessAssetRepository(BusinessCoreCatalogRepository[BusinessAsset]):
    model_class = BusinessAsset

    def list_by_site(self, tenant_db: Session, site_id: int, *, include_inactive: bool = True) -> list[BusinessAsset]:
        query = tenant_db.query(BusinessAsset).filter(BusinessAsset.site_id == site_id)
        if not include_inactive:
            query = query.filter(BusinessAsset.is_active.is_(True))
        return query.order_by(BusinessAsset.sort_order.asc(), BusinessAsset.id.asc()).all()

    def get_by_code(self, tenant_db: Session, code: str) -> BusinessAsset | None:
        return (
            tenant_db.query(BusinessAsset)
            .filter(func.lower(BusinessAsset.asset_code) == code.strip().lower())
            .first()
        )
