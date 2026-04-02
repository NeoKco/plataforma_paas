from sqlalchemy.orm import Session

from app.apps.tenant_modules.business_core.models import BusinessWorkGroup
from app.apps.tenant_modules.business_core.repositories.catalog_repository import (
    BusinessCoreCatalogRepository,
)


class BusinessWorkGroupRepository(BusinessCoreCatalogRepository[BusinessWorkGroup]):
    model_class = BusinessWorkGroup

    def get_by_code(
        self,
        tenant_db: Session,
        code: str,
    ) -> BusinessWorkGroup | None:
        return (
            tenant_db.query(BusinessWorkGroup)
            .filter(BusinessWorkGroup.code == code)
            .first()
        )
