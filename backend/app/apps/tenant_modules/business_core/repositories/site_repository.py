from sqlalchemy.orm import Session

from app.apps.tenant_modules.business_core.models import BusinessSite
from app.apps.tenant_modules.business_core.repositories.catalog_repository import (
    BusinessCoreCatalogRepository,
)


class BusinessSiteRepository(BusinessCoreCatalogRepository[BusinessSite]):
    model_class = BusinessSite

    def get_by_site_code(
        self,
        tenant_db: Session,
        site_code: str,
    ) -> BusinessSite | None:
        return (
            tenant_db.query(BusinessSite)
            .filter(BusinessSite.site_code == site_code)
            .first()
        )

    def list_by_client(
        self,
        tenant_db: Session,
        client_id: int,
        *,
        include_inactive: bool = True,
    ) -> list[BusinessSite]:
        query = tenant_db.query(BusinessSite).filter(BusinessSite.client_id == client_id)
        if not include_inactive:
            query = query.filter(BusinessSite.is_active.is_(True))
        return query.order_by(BusinessSite.sort_order.asc(), BusinessSite.id.asc()).all()
