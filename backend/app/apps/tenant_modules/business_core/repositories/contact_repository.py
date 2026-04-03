from sqlalchemy import func
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

    def get_by_name_in_organization(
        self,
        tenant_db: Session,
        organization_id: int,
        full_name: str,
    ) -> BusinessContact | None:
        return (
            tenant_db.query(BusinessContact)
            .filter(
                BusinessContact.organization_id == organization_id,
                func.lower(BusinessContact.full_name) == full_name.strip().lower(),
            )
            .first()
        )

    def get_by_email_in_organization(
        self,
        tenant_db: Session,
        organization_id: int,
        email: str,
    ) -> BusinessContact | None:
        return (
            tenant_db.query(BusinessContact)
            .filter(
                BusinessContact.organization_id == organization_id,
                func.lower(BusinessContact.email) == email.strip().lower(),
            )
            .first()
        )

    def get_by_phone_in_organization(
        self,
        tenant_db: Session,
        organization_id: int,
        phone: str,
    ) -> BusinessContact | None:
        return (
            tenant_db.query(BusinessContact)
            .filter(
                BusinessContact.organization_id == organization_id,
                BusinessContact.phone == phone.strip(),
            )
            .first()
        )
