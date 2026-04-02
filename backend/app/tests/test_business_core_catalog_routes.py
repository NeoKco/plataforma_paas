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
from app.apps.tenant_modules.business_core.api.organizations import (
    create_business_organization,
    delete_business_organization,
    get_business_organization,
    list_business_organizations,
    update_business_organization_status,
)
from app.apps.tenant_modules.business_core.schemas import (
    BusinessClientCreateRequest,
    BusinessCoreStatusUpdateRequest,
    BusinessOrganizationCreateRequest,
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
                current_user=self._current_user(),
                tenant_db=object(),
            )

        self.assertEqual(response.total, 1)
        self.assertEqual(response.data[0].name, "Acme Ltda")
        self.assertEqual(
            list_mock.call_args.kwargs,
            {"organization_kind": "client", "include_inactive": False},
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


if __name__ == "__main__":
    unittest.main()
