from sqlalchemy.orm import Session

from app.apps.tenant_modules.business_core.models import BusinessTaskType
from app.apps.tenant_modules.business_core.repositories.catalog_repository import (
    BusinessCoreCatalogRepository,
)


class BusinessTaskTypeRepository(BusinessCoreCatalogRepository[BusinessTaskType]):
    model_class = BusinessTaskType

    def get_by_code(
        self,
        tenant_db: Session,
        code: str,
    ) -> BusinessTaskType | None:
        return (
            tenant_db.query(BusinessTaskType)
            .filter(BusinessTaskType.code == code)
            .first()
        )
