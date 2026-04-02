from sqlalchemy.orm import Session

from app.apps.tenant_modules.business_core.models import BusinessContact
from app.apps.tenant_modules.business_core.repositories.catalog_repository import (
    BusinessCoreCatalogRepository,
)


class BusinessContactRepository(BusinessCoreCatalogRepository[BusinessContact]):
    model_class = BusinessContact
    name_field = "full_name"

    def list_by_organization(
        self,
        tenant_db: Session,
        organization_id: int,
        *,
        include_inactive: bool = True,
    ) -> list[BusinessContact]:
        query = tenant_db.query(BusinessContact).filter(
            BusinessContact.organization_id == organization_id
        )
        if not include_inactive:
            query = query.filter(BusinessContact.is_active.is_(True))
        return query.order_by(BusinessContact.sort_order.asc(), BusinessContact.id.asc()).all()

    def get_primary_by_organization(
        self,
        tenant_db: Session,
        organization_id: int,
    ) -> BusinessContact | None:
        return (
            tenant_db.query(BusinessContact)
            .filter(
                BusinessContact.organization_id == organization_id,
                BusinessContact.is_primary.is_(True),
            )
            .first()
        )
