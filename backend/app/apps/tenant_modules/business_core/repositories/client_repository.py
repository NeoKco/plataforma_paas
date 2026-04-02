from sqlalchemy.orm import Session

from app.apps.tenant_modules.business_core.models import BusinessClient
from app.apps.tenant_modules.business_core.repositories.catalog_repository import (
    BusinessCoreCatalogRepository,
)


class BusinessClientRepository(BusinessCoreCatalogRepository[BusinessClient]):
    model_class = BusinessClient
    name_field = None

    def get_by_client_code(
        self,
        tenant_db: Session,
        client_code: str,
    ) -> BusinessClient | None:
        return (
            tenant_db.query(BusinessClient)
            .filter(BusinessClient.client_code == client_code)
            .first()
        )

    def get_by_organization_id(
        self,
        tenant_db: Session,
        organization_id: int,
    ) -> BusinessClient | None:
        return (
            tenant_db.query(BusinessClient)
            .filter(BusinessClient.organization_id == organization_id)
            .first()
        )

    def list_by_organization(
        self,
        tenant_db: Session,
        organization_id: int,
        *,
        include_inactive: bool = True,
    ) -> list[BusinessClient]:
        query = tenant_db.query(BusinessClient).filter(
            BusinessClient.organization_id == organization_id
        )
        if not include_inactive:
            query = query.filter(BusinessClient.is_active.is_(True))
        return query.order_by(BusinessClient.sort_order.asc(), BusinessClient.id.asc()).all()
