from sqlalchemy.orm import Session

from app.apps.tenant_modules.business_core.models import BusinessOrganization
from app.apps.tenant_modules.business_core.repositories.catalog_repository import (
    BusinessCoreCatalogRepository,
)


class BusinessOrganizationRepository(BusinessCoreCatalogRepository[BusinessOrganization]):
    model_class = BusinessOrganization

    def get_by_tax_id(
        self,
        tenant_db: Session,
        tax_id: str,
    ) -> BusinessOrganization | None:
        return (
            tenant_db.query(BusinessOrganization)
            .filter(BusinessOrganization.tax_id == tax_id)
            .first()
        )

    def list_by_kind(
        self,
        tenant_db: Session,
        organization_kind: str,
        *,
        include_inactive: bool = True,
    ) -> list[BusinessOrganization]:
        query = tenant_db.query(BusinessOrganization).filter(
            BusinessOrganization.organization_kind == organization_kind.strip().lower()
        )
        if not include_inactive:
            query = query.filter(BusinessOrganization.is_active.is_(True))
        return query.order_by(BusinessOrganization.sort_order.asc(), BusinessOrganization.id.asc()).all()
