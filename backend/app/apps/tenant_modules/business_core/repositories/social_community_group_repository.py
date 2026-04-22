from app.apps.tenant_modules.business_core.models import SocialCommunityGroup
from app.apps.tenant_modules.business_core.repositories.catalog_repository import (
    BusinessCoreCatalogRepository,
)


class SocialCommunityGroupRepository(BusinessCoreCatalogRepository[SocialCommunityGroup]):
    model_class = SocialCommunityGroup
