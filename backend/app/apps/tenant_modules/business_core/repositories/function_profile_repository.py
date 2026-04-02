from sqlalchemy.orm import Session

from app.apps.tenant_modules.business_core.models import BusinessFunctionProfile
from app.apps.tenant_modules.business_core.repositories.catalog_repository import (
    BusinessCoreCatalogRepository,
)


class BusinessFunctionProfileRepository(
    BusinessCoreCatalogRepository[BusinessFunctionProfile]
):
    model_class = BusinessFunctionProfile

    def get_by_code(
        self,
        tenant_db: Session,
        code: str,
    ) -> BusinessFunctionProfile | None:
        return (
            tenant_db.query(BusinessFunctionProfile)
            .filter(BusinessFunctionProfile.code == code)
            .first()
        )
