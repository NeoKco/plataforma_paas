from sqlalchemy.orm import Session

from app.apps.tenant_modules.core.models.tenant_info import TenantInfo


class TenantInfoRepository:
    def get_first(self, tenant_db: Session) -> TenantInfo | None:
        return tenant_db.query(TenantInfo).first()
