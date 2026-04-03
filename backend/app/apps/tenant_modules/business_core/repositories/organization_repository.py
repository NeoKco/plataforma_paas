from sqlalchemy.orm import Session

from app.apps.tenant_modules.business_core.models import BusinessClient, BusinessOrganization
from app.apps.tenant_modules.business_core.repositories.catalog_repository import (
    BusinessCoreCatalogRepository,
)


class BusinessOrganizationRepository(BusinessCoreCatalogRepository[BusinessOrganization]):
    model_class = BusinessOrganization

    def list_all(
        self,
        tenant_db: Session,
        *,
        include_inactive: bool = True,
        exclude_client_organizations: bool = False,
    ) -> list[BusinessOrganization]:
        query = tenant_db.query(BusinessOrganization)
        if exclude_client_organizations:
            query = query.outerjoin(
                BusinessClient,
                BusinessClient.organization_id == BusinessOrganization.id,
            ).filter(
                BusinessClient.id.is_(None),
                BusinessOrganization.organization_kind != "client",
            )
        if not include_inactive:
            query = query.filter(BusinessOrganization.is_active.is_(True))
        return query.order_by(BusinessOrganization.sort_order.asc(), BusinessOrganization.id.asc()).all()

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
