from sqlalchemy import func
from sqlalchemy.orm import Session

from app.apps.tenant_modules.business_core.models import BusinessAssetType
from app.apps.tenant_modules.business_core.repositories.catalog_repository import BusinessCoreCatalogRepository


class BusinessAssetTypeRepository(BusinessCoreCatalogRepository[BusinessAssetType]):
    model_class = BusinessAssetType

    def get_by_code(self, tenant_db: Session, code: str) -> BusinessAssetType | None:
        return (
            tenant_db.query(BusinessAssetType)
            .filter(func.lower(BusinessAssetType.code) == code.strip().lower())
            .first()
        )
