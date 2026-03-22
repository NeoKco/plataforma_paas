from app.apps.tenant_modules.core.models.role import Role
from app.apps.tenant_modules.core.models.tenant_info import TenantInfo
from app.apps.tenant_modules.core.models.user import User

MIGRATION_ID = "0001_core"
DESCRIPTION = "Create core tenant tables"


def upgrade(connection) -> None:
    Role.__table__.create(bind=connection, checkfirst=True)
    TenantInfo.__table__.create(bind=connection, checkfirst=True)
    User.__table__.create(bind=connection, checkfirst=True)
