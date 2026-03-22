from app.apps.platform_control.models.platform_installation import PlatformInstallation
from app.apps.platform_control.models.platform_user import PlatformUser
from app.apps.platform_control.models.provisioning_job import ProvisioningJob
from app.apps.platform_control.models.tenant import Tenant

MIGRATION_ID = "0001_initial"
DESCRIPTION = "Create initial control database tables"


def upgrade(connection) -> None:
    PlatformInstallation.__table__.create(bind=connection, checkfirst=True)
    PlatformUser.__table__.create(bind=connection, checkfirst=True)
    Tenant.__table__.create(bind=connection, checkfirst=True)
    ProvisioningJob.__table__.create(bind=connection, checkfirst=True)
