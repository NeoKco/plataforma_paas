import os
import unittest
from types import SimpleNamespace
from unittest.mock import Mock

os.environ["DEBUG"] = "true"
os.environ["APP_ENV"] = "test"

from app.apps.tenant_modules.business_core.schemas import (  # noqa: E402
    BusinessSiteCreateRequest,
    BusinessSiteUpdateRequest,
)
from app.apps.tenant_modules.business_core.services.site_service import (  # noqa: E402
    BusinessSiteService,
)


class BusinessCoreSiteServiceTestCase(unittest.TestCase):
    def test_create_site_ignores_user_managed_site_code(self) -> None:
        site_repository = Mock()
        client_repository = Mock()
        client_repository.get_by_id.return_value = SimpleNamespace(id=1, is_active=True)
        site_repository.save.side_effect = lambda _tenant_db, site: site

        service = BusinessSiteService(
            site_repository=site_repository,
            client_repository=client_repository,
        )

        site = service.create_site(
            object(),
            BusinessSiteCreateRequest(
                client_id=1,
                name="Casa matriz",
                site_code="ADDR-123",
                address_line="Av. Siempre Viva 123",
                city="Santiago",
                region="RM",
                country_code="CL",
                reference_notes="Porton azul",
                is_active=True,
                sort_order=100,
            ),
        )

        self.assertIsNone(site.site_code)

    def test_update_site_preserves_existing_internal_site_code(self) -> None:
        existing_site = SimpleNamespace(
            id=7,
            client_id=1,
            name="Casa matriz",
            site_code="LEGACY-SITE-7",
            address_line="Av. Vieja 1",
            city="Santiago",
            region="RM",
            country_code="CL",
            reference_notes=None,
            is_active=True,
            sort_order=100,
        )
        site_repository = Mock()
        client_repository = Mock()
        site_repository.get_by_id.return_value = existing_site
        site_repository.get_by_site_code.return_value = existing_site
        client_repository.get_by_id.return_value = SimpleNamespace(id=1, is_active=True)
        site_repository.save.side_effect = lambda _tenant_db, site: site

        service = BusinessSiteService(
            site_repository=site_repository,
            client_repository=client_repository,
        )

        site = service.update_site(
            object(),
            7,
            BusinessSiteUpdateRequest(
                client_id=1,
                name="Casa matriz actualizada",
                site_code="ADDR-NUEVO",
                address_line="Av. Nueva 99",
                city="Santiago",
                region="RM",
                country_code="CL",
                reference_notes="Frente a plaza",
                is_active=True,
                sort_order=100,
            ),
        )

        self.assertEqual(site.site_code, "LEGACY-SITE-7")
        self.assertEqual(site.name, "Casa matriz actualizada")
        self.assertEqual(site.reference_notes, "Frente a plaza")


if __name__ == "__main__":
    unittest.main()
