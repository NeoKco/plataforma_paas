import os
import unittest
from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import patch

os.environ["DEBUG"] = "true"
os.environ["APP_ENV"] = "test"

from fastapi import HTTPException

from app.tests.fixtures import build_tenant_context
from app.apps.tenant_modules.business_core.api.clients import (
    create_business_client,
    delete_business_client,
    get_business_client,
    list_business_clients,
    update_business_client_status,
)
from app.apps.tenant_modules.business_core.api.contacts import (
    create_business_contact,
    delete_business_contact,
    get_business_contact,
    list_business_contacts,
    update_business_contact_status,
)
from app.apps.tenant_modules.business_core.api.function_profiles import (
    create_business_function_profile,
    delete_business_function_profile,
    list_business_function_profiles,
    update_business_function_profile_status,
)
from app.apps.tenant_modules.business_core.api.organizations import (
    create_business_organization,
    delete_business_organization,
    get_business_organization,
    list_business_organizations,
    update_business_organization_status,
)
from app.apps.tenant_modules.business_core.api.sites import (
    create_business_site,
    delete_business_site,
    get_business_site,
    list_business_sites,
    update_business_site_status,
)
from app.apps.tenant_modules.business_core.api.task_types import (
    create_business_task_type,
    delete_business_task_type,
    list_business_task_types,
    update_business_task_type_status,
)
from app.apps.tenant_modules.business_core.api.work_groups import (
    create_business_work_group,
    delete_business_work_group,
    list_business_work_groups,
    update_business_work_group_status,
)
from app.apps.tenant_modules.business_core.schemas import (
    BusinessClientCreateRequest,
    BusinessContactCreateRequest,
    BusinessCoreStatusUpdateRequest,
    BusinessFunctionProfileCreateRequest,
    BusinessOrganizationCreateRequest,
    BusinessSiteCreateRequest,
    BusinessTaskTypeCreateRequest,
    BusinessWorkGroupCreateRequest,
)


class BusinessCoreCatalogRoutesTestCase(unittest.TestCase):
    def _current_user(self) -> dict:
        return build_tenant_context(role="manager", email="manager@empresa-bootstrap.local")

    def test_list_business_organizations_returns_filtered_data(self) -> None:
        organization = SimpleNamespace(
            id=7,
            name="Acme Ltda",
            legal_name="Acme Limitada",
            tax_id="76.123.456-7",
            organization_kind="client",
            phone="+56912345678",
            email="contacto@acme.local",
            notes=None,
            is_active=True,
            sort_order=100,
            created_at=datetime(2026, 4, 2, 12, 0, tzinfo=timezone.utc),
            updated_at=datetime(2026, 4, 2, 12, 0, tzinfo=timezone.utc),
        )

        with patch(
            "app.apps.tenant_modules.business_core.api.organizations.organization_service.list_organizations",
            return_value=[organization],
        ) as list_mock:
            response = list_business_organizations(
                organization_kind="client",
                include_inactive=False,
                exclude_client_organizations=False,
                current_user=self._current_user(),
                tenant_db=object(),
            )

        self.assertEqual(response.total, 1)
        self.assertEqual(response.data[0].name, "Acme Ltda")
        self.assertEqual(
            list_mock.call_args.kwargs,
            {
                "organization_kind": "client",
                "include_inactive": False,
                "exclude_client_organizations": False,
            },
        )

    def test_list_business_organizations_can_exclude_client_organizations(self) -> None:
        with patch(
            "app.apps.tenant_modules.business_core.api.organizations.organization_service.list_organizations",
            return_value=[],
        ) as list_mock:
            response = list_business_organizations(
                organization_kind=None,
                include_inactive=True,
                exclude_client_organizations=True,
                current_user=self._current_user(),
                tenant_db=object(),
            )

        self.assertEqual(response.total, 0)
        self.assertEqual(
            list_mock.call_args.kwargs,
            {
                "organization_kind": None,
                "include_inactive": True,
                "exclude_client_organizations": True,
            },
        )

    def test_create_business_organization_translates_validation_error_to_400(self) -> None:
        with patch(
            "app.apps.tenant_modules.business_core.api.organizations.organization_service.create_organization",
            side_effect=ValueError("Ya existe una organizacion con ese nombre"),
        ):
            with self.assertRaises(HTTPException) as exc:
                create_business_organization(
                    payload=BusinessOrganizationCreateRequest(
                        name="Acme Ltda",
                        legal_name=None,
                        tax_id=None,
                        organization_kind="client",
                        phone=None,
                        email=None,
                        notes=None,
                        is_active=True,
                        sort_order=100,
                    ),
                    current_user=self._current_user(),
                    tenant_db=object(),
                )

        self.assertEqual(exc.exception.status_code, 400)

    def test_get_business_organization_returns_detail(self) -> None:
        organization = SimpleNamespace(
            id=3,
            name="Acme Ltda",
            legal_name="Acme Limitada",
            tax_id="76.123.456-7",
            organization_kind="client",
            phone=None,
            email=None,
            notes=None,
            is_active=True,
            sort_order=100,
            created_at=datetime(2026, 4, 2, 12, 0, tzinfo=timezone.utc),
            updated_at=datetime(2026, 4, 2, 12, 0, tzinfo=timezone.utc),
        )

        with patch(
            "app.apps.tenant_modules.business_core.api.organizations.organization_service.get_organization",
            return_value=organization,
        ):
            response = get_business_organization(
                organization_id=3,
                current_user=self._current_user(),
                tenant_db=object(),
            )

        self.assertEqual(response.data.tax_id, "76.123.456-7")

    def test_update_business_organization_status_returns_mutated_item(self) -> None:
        organization = SimpleNamespace(
            id=3,
            name="Acme Ltda",
            legal_name=None,
            tax_id=None,
            organization_kind="client",
            phone=None,
            email=None,
            notes=None,
            is_active=False,
            sort_order=100,
            created_at=datetime(2026, 4, 2, 12, 0, tzinfo=timezone.utc),
            updated_at=datetime(2026, 4, 2, 12, 0, tzinfo=timezone.utc),
        )

        with patch(
            "app.apps.tenant_modules.business_core.api.organizations.organization_service.set_organization_active",
            return_value=organization,
        ):
            response = update_business_organization_status(
                organization_id=3,
                payload=BusinessCoreStatusUpdateRequest(is_active=False),
                current_user=self._current_user(),
                tenant_db=object(),
            )

        self.assertFalse(response.data.is_active)

    def test_delete_business_organization_returns_deleted_item(self) -> None:
        organization = SimpleNamespace(
            id=3,
            name="Acme Ltda",
            legal_name=None,
            tax_id=None,
            organization_kind="client",
            phone=None,
            email=None,
            notes=None,
            is_active=False,
            sort_order=100,
            created_at=datetime(2026, 4, 2, 12, 0, tzinfo=timezone.utc),
            updated_at=datetime(2026, 4, 2, 12, 0, tzinfo=timezone.utc),
        )

        with patch(
            "app.apps.tenant_modules.business_core.api.organizations.organization_service.delete_organization",
            return_value=organization,
        ):
            response = delete_business_organization(
                organization_id=3,
                current_user=self._current_user(),
                tenant_db=object(),
            )

        self.assertEqual(response.data.name, "Acme Ltda")

    def test_list_business_clients_returns_filtered_data(self) -> None:
        client = SimpleNamespace(
            id=11,
            organization_id=7,
            client_code="ACME-001",
            service_status="active",
            commercial_notes="Cliente prioritario",
            is_active=True,
            sort_order=100,
            created_at=datetime(2026, 4, 2, 12, 0, tzinfo=timezone.utc),
            updated_at=datetime(2026, 4, 2, 12, 0, tzinfo=timezone.utc),
        )

        with patch(
            "app.apps.tenant_modules.business_core.api.clients.client_service.list_clients",
            return_value=[client],
        ) as list_mock:
            response = list_business_clients(
                organization_id=7,
                include_inactive=False,
                current_user=self._current_user(),
                tenant_db=object(),
            )

        self.assertEqual(response.total, 1)
        self.assertEqual(response.data[0].client_code, "ACME-001")
        self.assertEqual(
            list_mock.call_args.kwargs,
            {"organization_id": 7, "include_inactive": False},
        )

    def test_create_business_client_translates_validation_error_to_400(self) -> None:
        with patch(
            "app.apps.tenant_modules.business_core.api.clients.client_service.create_client",
            side_effect=ValueError("La organizacion seleccionada no existe"),
        ):
            with self.assertRaises(HTTPException) as exc:
                create_business_client(
                    payload=BusinessClientCreateRequest(
                        organization_id=99,
                        client_code="ACME-001",
                        service_status="active",
                        commercial_notes=None,
                        is_active=True,
                        sort_order=100,
                    ),
                    current_user=self._current_user(),
                    tenant_db=object(),
                )

        self.assertEqual(exc.exception.status_code, 400)

    def test_get_business_client_returns_detail(self) -> None:
        client = SimpleNamespace(
            id=11,
            organization_id=7,
            client_code="ACME-001",
            service_status="active",
            commercial_notes="Cliente prioritario",
            is_active=True,
            sort_order=100,
            created_at=datetime(2026, 4, 2, 12, 0, tzinfo=timezone.utc),
            updated_at=datetime(2026, 4, 2, 12, 0, tzinfo=timezone.utc),
        )

        with patch(
            "app.apps.tenant_modules.business_core.api.clients.client_service.get_client",
            return_value=client,
        ):
            response = get_business_client(
                client_id=11,
                current_user=self._current_user(),
                tenant_db=object(),
            )

        self.assertEqual(response.data.organization_id, 7)

    def test_update_business_client_status_returns_mutated_item(self) -> None:
        client = SimpleNamespace(
            id=11,
            organization_id=7,
            client_code="ACME-001",
            service_status="paused",
            commercial_notes=None,
            is_active=False,
            sort_order=100,
            created_at=datetime(2026, 4, 2, 12, 0, tzinfo=timezone.utc),
            updated_at=datetime(2026, 4, 2, 12, 0, tzinfo=timezone.utc),
        )

        with patch(
            "app.apps.tenant_modules.business_core.api.clients.client_service.set_client_active",
            return_value=client,
        ):
            response = update_business_client_status(
                client_id=11,
                payload=BusinessCoreStatusUpdateRequest(is_active=False),
                current_user=self._current_user(),
                tenant_db=object(),
            )

        self.assertFalse(response.data.is_active)
        self.assertEqual(response.data.service_status, "paused")

    def test_delete_business_client_returns_deleted_item(self) -> None:
        client = SimpleNamespace(
            id=11,
            organization_id=7,
            client_code="ACME-001",
            service_status="active",
            commercial_notes=None,
            is_active=True,
            sort_order=100,
            created_at=datetime(2026, 4, 2, 12, 0, tzinfo=timezone.utc),
            updated_at=datetime(2026, 4, 2, 12, 0, tzinfo=timezone.utc),
        )

        with patch(
            "app.apps.tenant_modules.business_core.api.clients.client_service.delete_client",
            return_value=client,
        ):
            response = delete_business_client(
                client_id=11,
                current_user=self._current_user(),
                tenant_db=object(),
            )

        self.assertEqual(response.data.client_code, "ACME-001")

    def test_list_business_contacts_returns_filtered_data(self) -> None:
        contact = SimpleNamespace(
            id=21,
            organization_id=7,
            full_name="Maria Perez",
            email="maria@acme.local",
            phone="+56911111111",
            role_title="Administracion",
            is_primary=True,
            is_active=True,
            sort_order=100,
            created_at=datetime(2026, 4, 2, 12, 0, tzinfo=timezone.utc),
            updated_at=datetime(2026, 4, 2, 12, 0, tzinfo=timezone.utc),
        )

        with patch(
            "app.apps.tenant_modules.business_core.api.contacts.contact_service.list_contacts",
            return_value=[contact],
        ) as list_mock:
            response = list_business_contacts(
                organization_id=7,
                include_inactive=False,
                current_user=self._current_user(),
                tenant_db=object(),
            )

        self.assertEqual(response.total, 1)
        self.assertTrue(response.data[0].is_primary)
        self.assertEqual(
            list_mock.call_args.kwargs,
            {"organization_id": 7, "include_inactive": False},
        )

    def test_create_business_contact_translates_validation_error_to_400(self) -> None:
        with patch(
            "app.apps.tenant_modules.business_core.api.contacts.contact_service.create_contact",
            side_effect=ValueError("La organizacion seleccionada ya tiene un contacto principal"),
        ):
            with self.assertRaises(HTTPException) as exc:
                create_business_contact(
                    payload=BusinessContactCreateRequest(
                        organization_id=7,
                        full_name="Maria Perez",
                        email="maria@acme.local",
                        phone=None,
                        role_title="Administracion",
                        is_primary=True,
                        is_active=True,
                        sort_order=100,
                    ),
                    current_user=self._current_user(),
                    tenant_db=object(),
                )

        self.assertEqual(exc.exception.status_code, 400)

    def test_get_business_contact_returns_detail(self) -> None:
        contact = SimpleNamespace(
            id=21,
            organization_id=7,
            full_name="Maria Perez",
            email="maria@acme.local",
            phone="+56911111111",
            role_title="Administracion",
            is_primary=True,
            is_active=True,
            sort_order=100,
            created_at=datetime(2026, 4, 2, 12, 0, tzinfo=timezone.utc),
            updated_at=datetime(2026, 4, 2, 12, 0, tzinfo=timezone.utc),
        )

        with patch(
            "app.apps.tenant_modules.business_core.api.contacts.contact_service.get_contact",
            return_value=contact,
        ):
            response = get_business_contact(
                contact_id=21,
                current_user=self._current_user(),
                tenant_db=object(),
            )

        self.assertEqual(response.data.full_name, "Maria Perez")

    def test_update_business_contact_status_returns_mutated_item(self) -> None:
        contact = SimpleNamespace(
            id=21,
            organization_id=7,
            full_name="Maria Perez",
            email="maria@acme.local",
            phone=None,
            role_title="Administracion",
            is_primary=False,
            is_active=False,
            sort_order=100,
            created_at=datetime(2026, 4, 2, 12, 0, tzinfo=timezone.utc),
            updated_at=datetime(2026, 4, 2, 12, 0, tzinfo=timezone.utc),
        )

        with patch(
            "app.apps.tenant_modules.business_core.api.contacts.contact_service.set_contact_active",
            return_value=contact,
        ):
            response = update_business_contact_status(
                contact_id=21,
                payload=BusinessCoreStatusUpdateRequest(is_active=False),
                current_user=self._current_user(),
                tenant_db=object(),
            )

        self.assertFalse(response.data.is_active)

    def test_delete_business_contact_returns_deleted_item(self) -> None:
        contact = SimpleNamespace(
            id=21,
            organization_id=7,
            full_name="Maria Perez",
            email="maria@acme.local",
            phone=None,
            role_title="Administracion",
            is_primary=False,
            is_active=True,
            sort_order=100,
            created_at=datetime(2026, 4, 2, 12, 0, tzinfo=timezone.utc),
            updated_at=datetime(2026, 4, 2, 12, 0, tzinfo=timezone.utc),
        )

        with patch(
            "app.apps.tenant_modules.business_core.api.contacts.contact_service.delete_contact",
            return_value=contact,
        ):
            response = delete_business_contact(
                contact_id=21,
                current_user=self._current_user(),
                tenant_db=object(),
            )

        self.assertEqual(response.data.email, "maria@acme.local")

    def test_list_business_sites_returns_filtered_data(self) -> None:
        site = SimpleNamespace(
            id=31,
            client_id=11,
            name="Casa Matriz",
            site_code="ACME-HQ",
            address_line="Av. Siempre Viva 123",
            city="Santiago",
            region="RM",
            country_code="CL",
            reference_notes=None,
            is_active=True,
            sort_order=100,
            created_at=datetime(2026, 4, 2, 12, 0, tzinfo=timezone.utc),
            updated_at=datetime(2026, 4, 2, 12, 0, tzinfo=timezone.utc),
        )

        with patch(
            "app.apps.tenant_modules.business_core.api.sites.site_service.list_sites",
            return_value=[site],
        ) as list_mock:
            response = list_business_sites(
                client_id=11,
                include_inactive=False,
                current_user=self._current_user(),
                tenant_db=object(),
            )

        self.assertEqual(response.total, 1)
        self.assertEqual(response.data[0].site_code, "ACME-HQ")
        self.assertEqual(
            list_mock.call_args.kwargs,
            {"client_id": 11, "include_inactive": False},
        )

    def test_create_business_site_translates_validation_error_to_400(self) -> None:
        with patch(
            "app.apps.tenant_modules.business_core.api.sites.site_service.create_site",
            side_effect=ValueError("El cliente seleccionado no existe"),
        ):
            with self.assertRaises(HTTPException) as exc:
                create_business_site(
                    payload=BusinessSiteCreateRequest(
                        client_id=11,
                        name="Casa Matriz",
                        site_code="ACME-HQ",
                        address_line=None,
                        city="Santiago",
                        region="RM",
                        country_code="CL",
                        reference_notes=None,
                        is_active=True,
                        sort_order=100,
                    ),
                    current_user=self._current_user(),
                    tenant_db=object(),
                )

        self.assertEqual(exc.exception.status_code, 400)

    def test_get_business_site_returns_detail(self) -> None:
        site = SimpleNamespace(
            id=31,
            client_id=11,
            name="Casa Matriz",
            site_code="ACME-HQ",
            address_line="Av. Siempre Viva 123",
            city="Santiago",
            region="RM",
            country_code="CL",
            reference_notes=None,
            is_active=True,
            sort_order=100,
            created_at=datetime(2026, 4, 2, 12, 0, tzinfo=timezone.utc),
            updated_at=datetime(2026, 4, 2, 12, 0, tzinfo=timezone.utc),
        )

        with patch(
            "app.apps.tenant_modules.business_core.api.sites.site_service.get_site",
            return_value=site,
        ):
            response = get_business_site(
                site_id=31,
                current_user=self._current_user(),
                tenant_db=object(),
            )

        self.assertEqual(response.data.city, "Santiago")

    def test_update_business_site_status_returns_mutated_item(self) -> None:
        site = SimpleNamespace(
            id=31,
            client_id=11,
            name="Casa Matriz",
            site_code="ACME-HQ",
            address_line=None,
            city="Santiago",
            region="RM",
            country_code="CL",
            reference_notes=None,
            is_active=False,
            sort_order=100,
            created_at=datetime(2026, 4, 2, 12, 0, tzinfo=timezone.utc),
            updated_at=datetime(2026, 4, 2, 12, 0, tzinfo=timezone.utc),
        )

        with patch(
            "app.apps.tenant_modules.business_core.api.sites.site_service.set_site_active",
            return_value=site,
        ):
            response = update_business_site_status(
                site_id=31,
                payload=BusinessCoreStatusUpdateRequest(is_active=False),
                current_user=self._current_user(),
                tenant_db=object(),
            )

        self.assertFalse(response.data.is_active)

    def test_delete_business_site_returns_deleted_item(self) -> None:
        site = SimpleNamespace(
            id=31,
            client_id=11,
            name="Casa Matriz",
            site_code="ACME-HQ",
            address_line=None,
            city="Santiago",
            region="RM",
            country_code="CL",
            reference_notes=None,
            is_active=True,
            sort_order=100,
            created_at=datetime(2026, 4, 2, 12, 0, tzinfo=timezone.utc),
            updated_at=datetime(2026, 4, 2, 12, 0, tzinfo=timezone.utc),
        )

        with patch(
            "app.apps.tenant_modules.business_core.api.sites.site_service.delete_site",
            return_value=site,
        ):
            response = delete_business_site(
                site_id=31,
                current_user=self._current_user(),
                tenant_db=object(),
            )

        self.assertEqual(response.data.name, "Casa Matriz")

    def test_list_business_function_profiles_returns_filtered_data(self) -> None:
        item = SimpleNamespace(
            id=31,
            code="tecnico",
            name="Técnico",
            description="Trabajo en terreno",
            is_active=True,
            sort_order=100,
            created_at=datetime(2026, 4, 2, 12, 0, tzinfo=timezone.utc),
            updated_at=datetime(2026, 4, 2, 12, 0, tzinfo=timezone.utc),
        )

        with patch(
            "app.apps.tenant_modules.business_core.api.function_profiles.function_profile_service.list_function_profiles",
            return_value=[item],
        ) as list_mock:
            response = list_business_function_profiles(
                include_inactive=False,
                current_user=self._current_user(),
                tenant_db=object(),
            )

        self.assertEqual(response.total, 1)
        self.assertEqual(response.data[0].code, "tecnico")
        self.assertEqual(list_mock.call_args.kwargs, {"include_inactive": False})

    def test_create_business_function_profile_translates_validation_error_to_400(self) -> None:
        with patch(
            "app.apps.tenant_modules.business_core.api.function_profiles.function_profile_service.create_function_profile",
            side_effect=ValueError("Ya existe un perfil funcional con ese codigo"),
        ):
            with self.assertRaises(HTTPException) as exc:
                create_business_function_profile(
                    payload=BusinessFunctionProfileCreateRequest(
                        code="tecnico",
                        name="Técnico",
                        description=None,
                        is_active=True,
                        sort_order=100,
                    ),
                    current_user=self._current_user(),
                    tenant_db=object(),
                )

        self.assertEqual(exc.exception.status_code, 400)

    def test_update_business_function_profile_status_returns_mutated_item(self) -> None:
        item = SimpleNamespace(
            id=31,
            code="tecnico",
            name="Técnico",
            description=None,
            is_active=False,
            sort_order=100,
            created_at=datetime(2026, 4, 2, 12, 0, tzinfo=timezone.utc),
            updated_at=datetime(2026, 4, 2, 12, 0, tzinfo=timezone.utc),
        )

        with patch(
            "app.apps.tenant_modules.business_core.api.function_profiles.function_profile_service.set_function_profile_active",
            return_value=item,
        ):
            response = update_business_function_profile_status(
                function_profile_id=31,
                payload=BusinessCoreStatusUpdateRequest(is_active=False),
                current_user=self._current_user(),
                tenant_db=object(),
            )

        self.assertFalse(response.data.is_active)

    def test_delete_business_function_profile_returns_deleted_item(self) -> None:
        item = SimpleNamespace(
            id=31,
            code="tecnico",
            name="Técnico",
            description=None,
            is_active=False,
            sort_order=100,
            created_at=datetime(2026, 4, 2, 12, 0, tzinfo=timezone.utc),
            updated_at=datetime(2026, 4, 2, 12, 0, tzinfo=timezone.utc),
        )

        with patch(
            "app.apps.tenant_modules.business_core.api.function_profiles.function_profile_service.delete_function_profile",
            return_value=item,
        ):
            response = delete_business_function_profile(
                function_profile_id=31,
                current_user=self._current_user(),
                tenant_db=object(),
            )

        self.assertEqual(response.data.code, "tecnico")

    def test_list_business_work_groups_returns_filtered_data(self) -> None:
        item = SimpleNamespace(
            id=41,
            code="terreno-norte",
            name="Terreno Norte",
            description="Equipo técnico norte",
            group_kind="field",
            is_active=True,
            sort_order=100,
            created_at=datetime(2026, 4, 2, 12, 0, tzinfo=timezone.utc),
            updated_at=datetime(2026, 4, 2, 12, 0, tzinfo=timezone.utc),
        )

        with patch(
            "app.apps.tenant_modules.business_core.api.work_groups.work_group_service.list_work_groups",
            return_value=[item],
        ) as list_mock:
            response = list_business_work_groups(
                include_inactive=False,
                group_kind="field",
                current_user=self._current_user(),
                tenant_db=object(),
            )

        self.assertEqual(response.total, 1)
        self.assertEqual(response.data[0].group_kind, "field")
        self.assertEqual(
            list_mock.call_args.kwargs,
            {"include_inactive": False, "group_kind": "field"},
        )

    def test_create_business_work_group_translates_validation_error_to_400(self) -> None:
        with patch(
            "app.apps.tenant_modules.business_core.api.work_groups.work_group_service.create_work_group",
            side_effect=ValueError("Ya existe un grupo de trabajo con ese nombre"),
        ):
            with self.assertRaises(HTTPException) as exc:
                create_business_work_group(
                    payload=BusinessWorkGroupCreateRequest(
                        code="terreno-norte",
                        name="Terreno Norte",
                        description=None,
                        group_kind="field",
                        is_active=True,
                        sort_order=100,
                    ),
                    current_user=self._current_user(),
                    tenant_db=object(),
                )

        self.assertEqual(exc.exception.status_code, 400)

    def test_update_business_work_group_status_returns_mutated_item(self) -> None:
        item = SimpleNamespace(
            id=41,
            code="terreno-norte",
            name="Terreno Norte",
            description=None,
            group_kind="field",
            is_active=False,
            sort_order=100,
            created_at=datetime(2026, 4, 2, 12, 0, tzinfo=timezone.utc),
            updated_at=datetime(2026, 4, 2, 12, 0, tzinfo=timezone.utc),
        )

        with patch(
            "app.apps.tenant_modules.business_core.api.work_groups.work_group_service.set_work_group_active",
            return_value=item,
        ):
            response = update_business_work_group_status(
                work_group_id=41,
                payload=BusinessCoreStatusUpdateRequest(is_active=False),
                current_user=self._current_user(),
                tenant_db=object(),
            )

        self.assertFalse(response.data.is_active)

    def test_delete_business_work_group_returns_deleted_item(self) -> None:
        item = SimpleNamespace(
            id=41,
            code="terreno-norte",
            name="Terreno Norte",
            description=None,
            group_kind="field",
            is_active=False,
            sort_order=100,
            created_at=datetime(2026, 4, 2, 12, 0, tzinfo=timezone.utc),
            updated_at=datetime(2026, 4, 2, 12, 0, tzinfo=timezone.utc),
        )

        with patch(
            "app.apps.tenant_modules.business_core.api.work_groups.work_group_service.delete_work_group",
            return_value=item,
        ):
            response = delete_business_work_group(
                work_group_id=41,
                current_user=self._current_user(),
                tenant_db=object(),
            )

        self.assertEqual(response.data.name, "Terreno Norte")

    def test_list_business_task_types_returns_filtered_data(self) -> None:
        item = SimpleNamespace(
            id=51,
            code="mantencion-preventiva",
            name="Mantención preventiva",
            description="Rutina base",
            color="#2563eb",
            icon="calendar",
            is_active=True,
            sort_order=100,
            created_at=datetime(2026, 4, 2, 12, 0, tzinfo=timezone.utc),
            updated_at=datetime(2026, 4, 2, 12, 0, tzinfo=timezone.utc),
        )

        with patch(
            "app.apps.tenant_modules.business_core.api.task_types.task_type_service.list_task_types",
            return_value=[item],
        ) as list_mock:
            response = list_business_task_types(
                include_inactive=False,
                current_user=self._current_user(),
                tenant_db=object(),
            )

        self.assertEqual(response.total, 1)
        self.assertEqual(response.data[0].color, "#2563eb")
        self.assertEqual(list_mock.call_args.kwargs, {"include_inactive": False})

    def test_create_business_task_type_translates_validation_error_to_400(self) -> None:
        with patch(
            "app.apps.tenant_modules.business_core.api.task_types.task_type_service.create_task_type",
            side_effect=ValueError("Ya existe un tipo de tarea con ese codigo"),
        ):
            with self.assertRaises(HTTPException) as exc:
                create_business_task_type(
                    payload=BusinessTaskTypeCreateRequest(
                        code="mantencion-preventiva",
                        name="Mantención preventiva",
                        description=None,
                        color="#2563eb",
                        icon="calendar",
                        is_active=True,
                        sort_order=100,
                    ),
                    current_user=self._current_user(),
                    tenant_db=object(),
                )

        self.assertEqual(exc.exception.status_code, 400)

    def test_update_business_task_type_status_returns_mutated_item(self) -> None:
        item = SimpleNamespace(
            id=51,
            code="mantencion-preventiva",
            name="Mantención preventiva",
            description=None,
            color="#2563eb",
            icon="calendar",
            is_active=False,
            sort_order=100,
            created_at=datetime(2026, 4, 2, 12, 0, tzinfo=timezone.utc),
            updated_at=datetime(2026, 4, 2, 12, 0, tzinfo=timezone.utc),
        )

        with patch(
            "app.apps.tenant_modules.business_core.api.task_types.task_type_service.set_task_type_active",
            return_value=item,
        ):
            response = update_business_task_type_status(
                task_type_id=51,
                payload=BusinessCoreStatusUpdateRequest(is_active=False),
                current_user=self._current_user(),
                tenant_db=object(),
            )

        self.assertFalse(response.data.is_active)

    def test_delete_business_task_type_returns_deleted_item(self) -> None:
        item = SimpleNamespace(
            id=51,
            code="mantencion-preventiva",
            name="Mantención preventiva",
            description=None,
            color="#2563eb",
            icon="calendar",
            is_active=False,
            sort_order=100,
            created_at=datetime(2026, 4, 2, 12, 0, tzinfo=timezone.utc),
            updated_at=datetime(2026, 4, 2, 12, 0, tzinfo=timezone.utc),
        )

        with patch(
            "app.apps.tenant_modules.business_core.api.task_types.task_type_service.delete_task_type",
            return_value=item,
        ):
            response = delete_business_task_type(
                task_type_id=51,
                current_user=self._current_user(),
                tenant_db=object(),
            )

        self.assertEqual(response.data.code, "mantencion-preventiva")


if __name__ == "__main__":
    unittest.main()
