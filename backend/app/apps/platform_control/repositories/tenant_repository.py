from sqlalchemy.orm import Session, selectinload

from app.apps.platform_control.models.tenant import Tenant
from app.apps.platform_control.models.tenant_subscription import TenantSubscription


class TenantRepository:
    def _base_query(self, db: Session):
        return db.query(Tenant).options(
            selectinload(Tenant.subscription).selectinload(TenantSubscription.items)
        )

    def list_all(self, db: Session) -> list[Tenant]:
        return self._base_query(db).order_by(Tenant.id.asc()).all()

    def get_by_slug(self, db: Session, slug: str) -> Tenant | None:
        return self._base_query(db).filter(Tenant.slug == slug).first()

    def get_by_billing_provider_subscription_id(
        self,
        db: Session,
        *,
        provider: str,
        provider_subscription_id: str,
    ) -> Tenant | None:
        return (
            self._base_query(db)
            .filter(Tenant.billing_provider == provider)
            .filter(Tenant.billing_provider_subscription_id == provider_subscription_id)
            .first()
        )

    def get_by_billing_provider_customer_id(
        self,
        db: Session,
        *,
        provider: str,
        provider_customer_id: str,
    ) -> Tenant | None:
        return (
            self._base_query(db)
            .filter(Tenant.billing_provider == provider)
            .filter(Tenant.billing_provider_customer_id == provider_customer_id)
            .first()
        )

    def get_by_id(self, db: Session, tenant_id: int) -> Tenant | None:
        return self._base_query(db).filter(Tenant.id == tenant_id).first()

    def save(self, db: Session, tenant: Tenant) -> Tenant:
        db.add(tenant)
        db.commit()
        db.refresh(tenant)
        return tenant

    def get_by_slug_and_status(
        self,
        db: Session,
        slug: str,
        status: str,
    ) -> Tenant | None:
        return (
            self._base_query(db)
            .filter(Tenant.slug == slug)
            .filter(Tenant.status == status)
            .first()
        )

    def refresh(self, db: Session, tenant: Tenant) -> None:
        db.refresh(tenant)

    def delete(self, db: Session, tenant: Tenant) -> None:
        db.delete(tenant)
        db.commit()
