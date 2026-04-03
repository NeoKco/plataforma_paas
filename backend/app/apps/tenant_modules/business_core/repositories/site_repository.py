from sqlalchemy import func
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
            .filter(func.lower(BusinessSite.site_code) == site_code.strip().lower())
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

    def get_by_name_in_client(
        self,
        tenant_db: Session,
        client_id: int,
        name: str,
    ) -> BusinessSite | None:
        return (
            tenant_db.query(BusinessSite)
            .filter(
                BusinessSite.client_id == client_id,
                func.lower(BusinessSite.name) == name.strip().lower(),
            )
            .first()
        )

    def get_by_address_in_client(
        self,
        tenant_db: Session,
        *,
        client_id: int,
        address_line: str,
        commune: str | None,
        city: str | None,
        region: str | None,
    ) -> BusinessSite | None:
        query = tenant_db.query(BusinessSite).filter(
            BusinessSite.client_id == client_id,
            func.lower(func.coalesce(BusinessSite.address_line, "")) == address_line.strip().lower(),
            func.lower(func.coalesce(BusinessSite.commune, "")) == (commune or "").strip().lower(),
            func.lower(func.coalesce(BusinessSite.city, "")) == (city or "").strip().lower(),
            func.lower(func.coalesce(BusinessSite.region, "")) == (region or "").strip().lower(),
        )
        return query.first()
