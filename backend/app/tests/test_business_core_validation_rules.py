import os
import unittest
from types import SimpleNamespace
from unittest.mock import Mock
from sqlalchemy.exc import ProgrammingError

os.environ["DEBUG"] = "true"
os.environ["APP_ENV"] = "test"

from app.apps.tenant_modules.business_core.schemas import (  # noqa: E402
    BusinessClientCreateRequest,
    BusinessContactCreateRequest,
    BusinessOrganizationCreateRequest,
    BusinessSiteCreateRequest,
    BusinessWorkGroupMemberCreateRequest,
)
from app.apps.tenant_modules.business_core.services.client_service import (  # noqa: E402
    BusinessClientService,
)
from app.apps.tenant_modules.business_core.services.contact_service import (  # noqa: E402
    BusinessContactService,
)
from app.apps.tenant_modules.business_core.services.organization_service import (  # noqa: E402
    BusinessOrganizationService,
)
from app.apps.tenant_modules.business_core.services.site_service import (  # noqa: E402
    BusinessSiteService,
)
from app.apps.tenant_modules.business_core.services.work_group_member_service import (  # noqa: E402
    BusinessWorkGroupMemberService,
)


class BusinessCoreValidationRulesTestCase(unittest.TestCase):
    def test_organization_rejects_duplicate_name_case_insensitive(self) -> None:
        repository = Mock()
        repository.list_all.return_value = [
            SimpleNamespace(id=1, name="Ácme   Ltda", tax_id=None),
        ]
        service = BusinessOrganizationService(organization_repository=repository)

        with self.assertRaises(ValueError) as exc:
            service.create_organization(
                object(),
                BusinessOrganizationCreateRequest(
                    name=" acme ltda ",
                    legal_name=None,
                    tax_id=None,
                    organization_kind="supplier",
                    phone=None,
                    email=None,
                    notes=None,
                    is_active=True,
                    sort_order=100,
                ),
            )

        self.assertIn("Ya existe una organizacion con ese nombre", str(exc.exception))

    def test_organization_rejects_duplicate_tax_id_with_format_variation(self) -> None:
        repository = Mock()
        repository.list_all.return_value = [
            SimpleNamespace(id=7, name="Acme Ltda", tax_id="76.123.456-7"),
        ]
        service = BusinessOrganizationService(organization_repository=repository)

        with self.assertRaises(ValueError) as exc:
            service.create_organization(
                object(),
                BusinessOrganizationCreateRequest(
                    name="Acme Nueva",
                    legal_name=None,
                    tax_id="76123456-7",
                    organization_kind="supplier",
                    phone=None,
                    email=None,
                    notes=None,
                    is_active=True,
                    sort_order=100,
                ),
            )

        self.assertIn(
            "Ya existe una organizacion con ese identificador tributario",
            str(exc.exception),
        )

    def test_client_rejects_duplicate_organization_association(self) -> None:
        client_repository = Mock()
        organization_repository = Mock()
        organization_repository.get_by_id.return_value = SimpleNamespace(
            id=7,
            tax_id="76.123.456-7",
            legal_name="Acme Limitada",
            name="Acme Ltda",
            organization_kind="client",
        )
        client_repository.get_by_organization_id.return_value = SimpleNamespace(id=12)
        service = BusinessClientService(
            client_repository=client_repository,
            organization_repository=organization_repository,
        )

        with self.assertRaises(ValueError) as exc:
            service.create_client(
                object(),
                BusinessClientCreateRequest(
                    organization_id=7,
                    client_code=None,
                    service_status="active",
                    commercial_notes=None,
                    is_active=True,
                    sort_order=100,
                ),
            )

        self.assertIn(
            "La organizacion seleccionada ya tiene un cliente asociado",
            str(exc.exception),
        )

    def test_client_create_generates_internal_code_from_organization(self) -> None:
        client_repository = Mock()
        organization_repository = Mock()
        organization_repository.get_by_id.return_value = SimpleNamespace(
            id=7,
            tax_id="76.123.456-7",
            legal_name="Acme Limitada",
            name="Acme Ltda",
            organization_kind="client",
        )
        client_repository.get_by_organization_id.return_value = None
        client_repository.get_by_client_code.return_value = None
        client_repository.save.side_effect = lambda _tenant_db, client: client
        service = BusinessClientService(
            client_repository=client_repository,
            organization_repository=organization_repository,
        )

        created = service.create_client(
            object(),
            BusinessClientCreateRequest(
                organization_id=7,
                client_code="LEGACY-CLIENT-7",
                service_status="active",
                commercial_notes=None,
                is_active=True,
                sort_order=100,
            ),
        )

        self.assertEqual(created.client_code, "CLI-76-123-456-7")

    def test_client_update_preserves_existing_internal_code(self) -> None:
        client_repository = Mock()
        organization_repository = Mock()
        current_client = SimpleNamespace(
            id=9,
            organization_id=7,
            client_code="CLI-76-123-456-7",
            service_status="active",
            commercial_notes=None,
            is_active=True,
            sort_order=100,
        )
        organization_repository.get_by_id.return_value = SimpleNamespace(
            id=7,
            tax_id="76.123.456-7",
            legal_name="Acme Limitada",
            name="Acme Ltda",
            organization_kind="client",
        )
        client_repository.get_by_id.return_value = current_client
        client_repository.get_by_organization_id.return_value = current_client
        client_repository.save.side_effect = lambda _tenant_db, client: client
        service = BusinessClientService(
            client_repository=client_repository,
            organization_repository=organization_repository,
        )

        updated = service.update_client(
            object(),
            9,
            BusinessClientCreateRequest(
                organization_id=7,
                client_code="LEGACY-CLIENT-2",
                service_status="active",
                commercial_notes=None,
                is_active=True,
                sort_order=100,
            ),
        )

        self.assertEqual(updated.client_code, "CLI-76-123-456-7")

    def test_client_delete_rejects_when_work_orders_exist(self) -> None:
        client_repository = Mock()
        organization_repository = Mock()
        tenant_db = Mock()
        tenant_db.query.return_value.filter.return_value.first.return_value = SimpleNamespace(id=55)
        client_repository.get_by_id.return_value = SimpleNamespace(id=9)
        service = BusinessClientService(
            client_repository=client_repository,
            organization_repository=organization_repository,
        )

        with self.assertRaises(ValueError) as exc:
            service.delete_client(tenant_db, 9)

        self.assertIn("ya tiene mantenciones registradas", str(exc.exception))

    def test_contact_rejects_duplicate_email_in_same_organization(self) -> None:
        contact_repository = Mock()
        organization_repository = Mock()
        organization_repository.get_by_id.return_value = SimpleNamespace(id=7, is_active=True)
        contact_repository.list_by_organization.return_value = [
            SimpleNamespace(
                id=22,
                full_name="Maria Perez",
                email="maria@acme.local",
                phone=None,
                is_primary=False,
            )
        ]
        service = BusinessContactService(
            contact_repository=contact_repository,
            organization_repository=organization_repository,
        )

        with self.assertRaises(ValueError) as exc:
            service.create_contact(
                object(),
                BusinessContactCreateRequest(
                    organization_id=7,
                    full_name="Maria Perez 2",
                    email="maria@acme.local",
                    phone=None,
                    role_title="Administracion",
                    is_primary=False,
                    is_active=True,
                    sort_order=100,
                ),
            )

        self.assertIn("Ya existe un contacto con ese email", str(exc.exception))

    def test_contact_rejects_duplicate_phone_with_format_variation(self) -> None:
        contact_repository = Mock()
        organization_repository = Mock()
        organization_repository.get_by_id.return_value = SimpleNamespace(id=7, is_active=True)
        contact_repository.list_by_organization.return_value = [
            SimpleNamespace(
                id=22,
                full_name="Maria Perez",
                email=None,
                phone="+56 9 1111 1111",
                is_primary=False,
            )
        ]
        service = BusinessContactService(
            contact_repository=contact_repository,
            organization_repository=organization_repository,
        )

        with self.assertRaises(ValueError) as exc:
            service.create_contact(
                object(),
                BusinessContactCreateRequest(
                    organization_id=7,
                    full_name="Pedro Soto",
                    email=None,
                    phone="+56911111111",
                    role_title="Terreno",
                    is_primary=False,
                    is_active=True,
                    sort_order=100,
                ),
            )

        self.assertIn("Ya existe un contacto con ese teléfono", str(exc.exception))

    def test_work_group_member_rejects_duplicate_group_membership(self) -> None:
        work_group_repository = Mock()
        work_group_member_repository = Mock()
        work_group_repository.get_by_id.return_value = SimpleNamespace(id=7, name="Terreno norte")
        work_group_member_repository.get_by_group_and_user.return_value = SimpleNamespace(id=22)
        service = BusinessWorkGroupMemberService(
            work_group_repository=work_group_repository,
            work_group_member_repository=work_group_member_repository,
        )
        tenant_db = Mock()
        user_query = Mock()
        user_query.filter.return_value.first.return_value = SimpleNamespace(id=5)
        tenant_db.query.return_value = user_query

        with self.assertRaises(ValueError) as exc:
            service.create_member(
                tenant_db,
                7,
                BusinessWorkGroupMemberCreateRequest(
                    tenant_user_id=5,
                    function_profile_id=None,
                    is_primary=False,
                    is_lead=False,
                    is_active=True,
                    starts_at=None,
                    ends_at=None,
                    notes=None,
                ),
            )

        self.assertIn("ya pertenece al grupo seleccionado", str(exc.exception).lower())

    def test_work_group_member_rejects_invalid_date_window(self) -> None:
        work_group_repository = Mock()
        work_group_member_repository = Mock()
        work_group_repository.get_by_id.return_value = SimpleNamespace(id=7, name="Terreno norte")
        work_group_member_repository.get_by_group_and_user.return_value = None
        service = BusinessWorkGroupMemberService(
            work_group_repository=work_group_repository,
            work_group_member_repository=work_group_member_repository,
        )
        tenant_db = Mock()
        user_query = Mock()
        user_query.filter.return_value.first.return_value = SimpleNamespace(id=5)
        tenant_db.query.return_value = user_query

        with self.assertRaises(ValueError) as exc:
            service.create_member(
                tenant_db,
                7,
                BusinessWorkGroupMemberCreateRequest(
                    tenant_user_id=5,
                    function_profile_id=None,
                    is_primary=False,
                    is_lead=False,
                    is_active=True,
                    starts_at="2026-04-10T09:00:00",
                    ends_at="2026-04-09T09:00:00",
                    notes=None,
                ),
            )

        self.assertIn("fecha final", str(exc.exception).lower())

    def test_work_group_member_counts_fall_back_to_empty_when_schema_is_old(self) -> None:
        work_group_repository = Mock()
        work_group_member_repository = Mock()
        work_group_member_repository.count_by_group_ids.side_effect = ProgrammingError(
            "select count(*) from business_work_group_members",
            {},
            Exception("UndefinedTable: business_work_group_members"),
        )
        service = BusinessWorkGroupMemberService(
            work_group_repository=work_group_repository,
            work_group_member_repository=work_group_member_repository,
        )
        tenant_db = Mock()

        counts = service.get_member_counts(tenant_db, [7, 8])

        self.assertEqual(counts, {})
        tenant_db.rollback.assert_called_once()

    def test_site_rejects_duplicate_address_in_same_client(self) -> None:
        site_repository = Mock()
        client_repository = Mock()
        client_repository.get_by_id.return_value = SimpleNamespace(id=1, is_active=True)
        site_repository.get_by_site_code.return_value = None
        site_repository.list_by_client.return_value = [
            SimpleNamespace(
                id=4,
                name="Casa matriz",
                address_line="Av. Siempre Viva 123",
                commune="Puente Alto",
                city="Santiago",
                region="RM",
            )
        ]
        service = BusinessSiteService(
            site_repository=site_repository,
            client_repository=client_repository,
        )

        with self.assertRaises(ValueError) as exc:
            service.create_site(
                object(),
                BusinessSiteCreateRequest(
                    client_id=1,
                    name="Sucursal centro",
                    site_code=None,
                    address_line="Av. Siempre Viva 123",
                    commune="Puente Alto",
                    city="Santiago",
                    region="RM",
                    country_code="CL",
                    reference_notes=None,
                    is_active=True,
                    sort_order=100,
                ),
            )

        self.assertIn("Ya existe una dirección igual", str(exc.exception))


if __name__ == "__main__":
    unittest.main()
