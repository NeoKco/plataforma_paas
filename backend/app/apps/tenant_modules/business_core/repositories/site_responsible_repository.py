from sqlalchemy.orm import Session

from app.apps.tenant_modules.business_core.models import BusinessSiteResponsible


class BusinessSiteResponsibleRepository:
    def list_all(
        self,
        tenant_db: Session,
        *,
        site_id: int | None = None,
    ) -> list[BusinessSiteResponsible]:
        query = tenant_db.query(BusinessSiteResponsible)
        if site_id is not None:
            query = query.filter(BusinessSiteResponsible.site_id == site_id)
        return query.order_by(
            BusinessSiteResponsible.is_primary.desc(),
            BusinessSiteResponsible.is_active.desc(),
            BusinessSiteResponsible.id.asc(),
        ).all()

    def get_by_id(self, tenant_db: Session, responsible_id: int) -> BusinessSiteResponsible | None:
        return (
            tenant_db.query(BusinessSiteResponsible)
            .filter(BusinessSiteResponsible.id == responsible_id)
            .first()
        )

    def get_by_site_and_user(
        self,
        tenant_db: Session,
        site_id: int,
        tenant_user_id: int,
    ) -> BusinessSiteResponsible | None:
        return (
            tenant_db.query(BusinessSiteResponsible)
            .filter(
                BusinessSiteResponsible.site_id == site_id,
                BusinessSiteResponsible.tenant_user_id == tenant_user_id,
            )
            .first()
        )

    def clear_primary_for_user(
        self,
        tenant_db: Session,
        tenant_user_id: int,
        *,
        exclude_responsible_id: int | None = None,
    ) -> None:
        query = tenant_db.query(BusinessSiteResponsible).filter(
            BusinessSiteResponsible.tenant_user_id == tenant_user_id,
            BusinessSiteResponsible.is_primary.is_(True),
        )
        if exclude_responsible_id is not None:
            query = query.filter(BusinessSiteResponsible.id != exclude_responsible_id)
        for item in query.all():
            item.is_primary = False
            tenant_db.add(item)

    def save(self, tenant_db: Session, item: BusinessSiteResponsible) -> BusinessSiteResponsible:
        tenant_db.add(item)
        tenant_db.commit()
        tenant_db.refresh(item)
        return item

    def delete(self, tenant_db: Session, item: BusinessSiteResponsible) -> None:
        tenant_db.delete(item)
        tenant_db.commit()
