import os
import unittest
from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import patch

os.environ["DEBUG"] = "true"
os.environ["APP_ENV"] = "test"

from fastapi import HTTPException

from app.apps.tenant_modules.maintenance.api.equipment_types import (
    create_maintenance_equipment_type,
    delete_maintenance_equipment_type,
    list_maintenance_equipment_types,
    update_maintenance_equipment_type_status,
)
from app.apps.tenant_modules.maintenance.api.history import (
    list_maintenance_history,
    list_maintenance_status_logs,
    list_maintenance_visits,
)
from app.apps.tenant_modules.maintenance.api.installations import (
    create_maintenance_installation,
    delete_maintenance_installation,
    list_maintenance_installations,
    update_maintenance_installation_status,
)
from app.apps.tenant_modules.maintenance.api.schedules import (
    get_maintenance_schedule_suggestion,
)
from app.apps.tenant_modules.maintenance.api.visits import (
    create_maintenance_visit,
    delete_maintenance_visit,
    list_maintenance_visits_catalog,
)
from app.apps.tenant_modules.maintenance.api.work_orders import (
    create_maintenance_work_order,
    delete_maintenance_work_order,
    list_maintenance_work_orders,
    update_maintenance_work_order_status,
)
from app.apps.tenant_modules.maintenance.schemas import (
    MaintenanceEquipmentTypeCreateRequest,
    MaintenanceInstallationCreateRequest,
    MaintenanceStatusUpdateRequest,
    MaintenanceVisitCreateRequest,
    MaintenanceWorkOrderCreateRequest,
)
from app.tests.fixtures import build_tenant_context


class MaintenanceCatalogRoutesTestCase(unittest.TestCase):
    def _current_user(self) -> dict:
        return build_tenant_context(role="manager", email="manager@empresa-bootstrap.local")

    def test_list_maintenance_equipment_types_returns_filtered_data(self) -> None:
        item = SimpleNamespace(
            id=7,
            code="sst",
            name="Sistema SST",
            description=None,
            is_active=True,
            sort_order=100,
            created_at=datetime(2026, 4, 2, 12, 0, tzinfo=timezone.utc),
            updated_at=datetime(2026, 4, 2, 12, 0, tzinfo=timezone.utc),
        )

        with patch(
            "app.apps.tenant_modules.maintenance.api.equipment_types.equipment_type_service.list_equipment_types",
            return_value=[item],
        ) as list_mock:
            response = list_maintenance_equipment_types(
                include_inactive=False,
                current_user=self._current_user(),
                tenant_db=object(),
            )

        self.assertEqual(response.total, 1)
        self.assertEqual(response.data[0].name, "Sistema SST")
        self.assertEqual(list_mock.call_args.kwargs, {"include_inactive": False})

    def test_create_maintenance_equipment_type_translates_validation_error_to_400(self) -> None:
        with patch(
            "app.apps.tenant_modules.maintenance.api.equipment_types.equipment_type_service.create_equipment_type",
            side_effect=ValueError("Ya existe un tipo de equipo con ese nombre"),
        ):
            with self.assertRaises(HTTPException) as exc:
                create_maintenance_equipment_type(
                    payload=MaintenanceEquipmentTypeCreateRequest(
                        code="sst",
                        name="Sistema SST",
                        description=None,
                        is_active=True,
                        sort_order=100,
                    ),
                    current_user=self._current_user(),
                    tenant_db=object(),
                )

        self.assertEqual(exc.exception.status_code, 400)

    def test_update_maintenance_equipment_type_status_returns_mutated_item(self) -> None:
        item = SimpleNamespace(
            id=7,
            code="sst",
            name="Sistema SST",
            description=None,
            is_active=False,
            sort_order=100,
            created_at=datetime(2026, 4, 2, 12, 0, tzinfo=timezone.utc),
            updated_at=datetime(2026, 4, 2, 12, 0, tzinfo=timezone.utc),
        )

        with patch(
            "app.apps.tenant_modules.maintenance.api.equipment_types.equipment_type_service.set_equipment_type_active",
            return_value=item,
        ):
            response = update_maintenance_equipment_type_status(
                equipment_type_id=7,
                payload=MaintenanceStatusUpdateRequest(maintenance_status="inactive"),
                current_user=self._current_user(),
                tenant_db=object(),
            )

        self.assertFalse(response.data.is_active)

    def test_delete_maintenance_equipment_type_returns_deleted_item(self) -> None:
        item = SimpleNamespace(
            id=7,
            code="sst",
            name="Sistema SST",
            description=None,
            is_active=True,
            sort_order=100,
            created_at=datetime(2026, 4, 2, 12, 0, tzinfo=timezone.utc),
            updated_at=datetime(2026, 4, 2, 12, 0, tzinfo=timezone.utc),
        )
        with patch(
            "app.apps.tenant_modules.maintenance.api.equipment_types.equipment_type_service.delete_equipment_type",
            return_value=item,
        ):
            response = delete_maintenance_equipment_type(
                equipment_type_id=7,
                current_user=self._current_user(),
                tenant_db=object(),
            )
        self.assertEqual(response.data.code, "sst")

    def test_list_maintenance_installations_returns_filtered_data(self) -> None:
        item = SimpleNamespace(
            id=9,
            site_id=31,
            equipment_type_id=7,
            name="Portón acceso norte",
            serial_number=None,
            manufacturer=None,
            model=None,
            installed_at=None,
            last_service_at=None,
            warranty_until=None,
            installation_status="active",
            location_note=None,
            technical_notes=None,
            is_active=True,
            sort_order=100,
            created_at=datetime(2026, 4, 2, 12, 0, tzinfo=timezone.utc),
            updated_at=datetime(2026, 4, 2, 12, 0, tzinfo=timezone.utc),
        )
        with patch(
            "app.apps.tenant_modules.maintenance.api.installations.installation_service.list_installations",
            return_value=[item],
        ) as list_mock:
            response = list_maintenance_installations(
                site_id=31,
                include_inactive=False,
                current_user=self._current_user(),
                tenant_db=object(),
            )
        self.assertEqual(response.total, 1)
        self.assertEqual(response.data[0].site_id, 31)
        self.assertEqual(
            list_mock.call_args.kwargs,
            {"site_id": 31, "equipment_type_id": None, "include_inactive": False},
        )

    def test_create_maintenance_installation_translates_validation_error_to_400(self) -> None:
        with patch(
            "app.apps.tenant_modules.maintenance.api.installations.installation_service.create_installation",
            side_effect=ValueError("El sitio seleccionado no existe"),
        ):
            with self.assertRaises(HTTPException) as exc:
                create_maintenance_installation(
                    payload=MaintenanceInstallationCreateRequest(
                        site_id=31,
                        equipment_type_id=7,
                        name="Portón acceso norte",
                    ),
                    current_user=self._current_user(),
                    tenant_db=object(),
                )
        self.assertEqual(exc.exception.status_code, 400)

    def test_update_maintenance_installation_status_returns_mutated_item(self) -> None:
        item = SimpleNamespace(
            id=9,
            site_id=31,
            equipment_type_id=7,
            name="Portón acceso norte",
            serial_number=None,
            manufacturer=None,
            model=None,
            installed_at=None,
            last_service_at=None,
            warranty_until=None,
            installation_status="active",
            location_note=None,
            technical_notes=None,
            is_active=False,
            sort_order=100,
            created_at=datetime(2026, 4, 2, 12, 0, tzinfo=timezone.utc),
            updated_at=datetime(2026, 4, 2, 12, 0, tzinfo=timezone.utc),
        )
        with patch(
            "app.apps.tenant_modules.maintenance.api.installations.installation_service.set_installation_active",
            return_value=item,
        ):
            response = update_maintenance_installation_status(
                installation_id=9,
                payload=MaintenanceStatusUpdateRequest(maintenance_status="inactive"),
                current_user=self._current_user(),
                tenant_db=object(),
            )
        self.assertFalse(response.data.is_active)

    def test_delete_maintenance_installation_returns_deleted_item(self) -> None:
        item = SimpleNamespace(
            id=9,
            site_id=31,
            equipment_type_id=7,
            name="Portón acceso norte",
            serial_number=None,
            manufacturer=None,
            model=None,
            installed_at=None,
            last_service_at=None,
            warranty_until=None,
            installation_status="active",
            location_note=None,
            technical_notes=None,
            is_active=True,
            sort_order=100,
            created_at=datetime(2026, 4, 2, 12, 0, tzinfo=timezone.utc),
            updated_at=datetime(2026, 4, 2, 12, 0, tzinfo=timezone.utc),
        )
        with patch(
            "app.apps.tenant_modules.maintenance.api.installations.installation_service.delete_installation",
            return_value=item,
        ):
            response = delete_maintenance_installation(
                installation_id=9,
                current_user=self._current_user(),
                tenant_db=object(),
            )
        self.assertEqual(response.data.name, "Portón acceso norte")

    def test_list_maintenance_work_orders_returns_filtered_data(self) -> None:
        item = SimpleNamespace(
            id=12,
            client_id=11,
            site_id=31,
            installation_id=9,
            external_reference="WO-001",
            title="Mantención mensual",
            description=None,
            priority="normal",
            scheduled_for=None,
            cancellation_reason=None,
            closure_notes=None,
            assigned_tenant_user_id=3,
            maintenance_status="scheduled",
            requested_at=datetime(2026, 4, 2, 12, 0, tzinfo=timezone.utc),
            completed_at=None,
            cancelled_at=None,
            created_by_user_id=2,
            created_at=datetime(2026, 4, 2, 12, 0, tzinfo=timezone.utc),
            updated_at=datetime(2026, 4, 2, 12, 0, tzinfo=timezone.utc),
        )
        with patch(
            "app.apps.tenant_modules.maintenance.api.work_orders.work_order_service.list_work_orders",
            return_value=[item],
        ) as list_mock:
            response = list_maintenance_work_orders(
                client_id=11,
                maintenance_status="scheduled",
                current_user=self._current_user(),
                tenant_db=object(),
            )
        self.assertEqual(response.total, 1)
        self.assertEqual(response.data[0].external_reference, "WO-001")
        self.assertEqual(
            list_mock.call_args.kwargs,
            {"client_id": 11, "site_id": None, "maintenance_status": "scheduled"},
        )

    def test_create_maintenance_work_order_translates_validation_error_to_400(self) -> None:
        with patch(
            "app.apps.tenant_modules.maintenance.api.work_orders.work_order_service.create_work_order",
            side_effect=ValueError("El sitio seleccionado no pertenece al cliente indicado"),
        ):
            with self.assertRaises(HTTPException) as exc:
                create_maintenance_work_order(
                    payload=MaintenanceWorkOrderCreateRequest(
                        client_id=11,
                        site_id=31,
                        installation_id=9,
                        title="Mantención mensual",
                    ),
                    current_user=self._current_user(),
                    tenant_db=object(),
                )
        self.assertEqual(exc.exception.status_code, 400)

    def test_update_maintenance_work_order_status_returns_mutated_item(self) -> None:
        item = SimpleNamespace(
            id=12,
            client_id=11,
            site_id=31,
            installation_id=9,
            external_reference="WO-001",
            title="Mantención mensual",
            description=None,
            priority="normal",
            scheduled_for=None,
            cancellation_reason=None,
            closure_notes=None,
            assigned_tenant_user_id=3,
            maintenance_status="completed",
            requested_at=datetime(2026, 4, 2, 12, 0, tzinfo=timezone.utc),
            completed_at=datetime(2026, 4, 2, 12, 0, tzinfo=timezone.utc),
            cancelled_at=None,
            created_by_user_id=2,
            created_at=datetime(2026, 4, 2, 12, 0, tzinfo=timezone.utc),
            updated_at=datetime(2026, 4, 2, 12, 0, tzinfo=timezone.utc),
        )
        with patch(
            "app.apps.tenant_modules.maintenance.api.work_orders.work_order_service.update_work_order_status",
            return_value=item,
        ):
            response = update_maintenance_work_order_status(
                work_order_id=12,
                payload=MaintenanceStatusUpdateRequest(
                    maintenance_status="completed",
                    note="Trabajo realizado",
                ),
                current_user=self._current_user(),
                tenant_db=object(),
        )
        self.assertEqual(response.data.maintenance_status, "completed")

    def test_list_maintenance_history_returns_closed_entries(self) -> None:
        work_order = SimpleNamespace(
            id=12,
            client_id=11,
            site_id=31,
            installation_id=9,
            external_reference="WO-001",
            title="Mantención mensual",
            description=None,
            priority="normal",
            cancellation_reason=None,
            closure_notes="Cierre técnico",
            maintenance_status="completed",
            requested_at=datetime(2026, 4, 2, 12, 0, tzinfo=timezone.utc),
            scheduled_for=None,
            completed_at=datetime(2026, 4, 3, 12, 0, tzinfo=timezone.utc),
            cancelled_at=None,
            created_by_user_id=2,
            created_at=datetime(2026, 4, 2, 12, 0, tzinfo=timezone.utc),
            updated_at=datetime(2026, 4, 3, 12, 0, tzinfo=timezone.utc),
        )
        log = SimpleNamespace(
            id=1,
            work_order_id=12,
            from_status="scheduled",
            to_status="completed",
            note="Cierre técnico",
            changed_by_user_id=2,
            changed_at=datetime(2026, 4, 3, 12, 0, tzinfo=timezone.utc),
        )
        visit = SimpleNamespace(
            id=2,
            work_order_id=12,
            visit_status="completed",
            scheduled_start_at=datetime(2026, 4, 3, 10, 0, tzinfo=timezone.utc),
            scheduled_end_at=datetime(2026, 4, 3, 11, 0, tzinfo=timezone.utc),
            actual_start_at=datetime(2026, 4, 3, 10, 5, tzinfo=timezone.utc),
            actual_end_at=datetime(2026, 4, 3, 10, 55, tzinfo=timezone.utc),
            assigned_tenant_user_id=3,
            assigned_group_label="Técnicos norte",
            notes="Sin observaciones",
            created_at=datetime(2026, 4, 3, 9, 0, tzinfo=timezone.utc),
            updated_at=datetime(2026, 4, 3, 12, 0, tzinfo=timezone.utc),
        )
        with patch(
            "app.apps.tenant_modules.maintenance.api.history.history_service.list_history",
            return_value=[{"work_order": work_order, "status_logs": [log], "visits": [visit]}],
        ):
            response = list_maintenance_history(
                client_id=11,
                current_user=self._current_user(),
                tenant_db=object(),
            )

        self.assertEqual(response.total, 1)
        self.assertEqual(response.data[0].status_logs[0].to_status, "completed")
        self.assertEqual(response.data[0].visits[0].assigned_group_label, "Técnicos norte")

    def test_get_maintenance_schedule_suggestion_returns_history_seed(self) -> None:
        reference_completed_at = datetime(2026, 4, 3, 18, 0, tzinfo=timezone.utc)
        with patch(
            "app.apps.tenant_modules.maintenance.api.schedules.schedule_service.suggest_schedule_seed",
            return_value={
                "client_id": 11,
                "site_id": 31,
                "installation_id": 9,
                "suggested_next_due_at": datetime(2027, 4, 3, 18, 0, tzinfo=timezone.utc),
                "last_executed_at": reference_completed_at,
                "source": "history_completed_this_year",
                "reference_work_order_id": 51,
                "reference_completed_at": reference_completed_at,
            },
        ) as suggestion_mock:
            response = get_maintenance_schedule_suggestion(
                client_id=11,
                site_id=31,
                installation_id=9,
                current_user=self._current_user(),
                tenant_db=object(),
            )

        self.assertEqual(response.data.source, "history_completed_this_year")
        self.assertEqual(response.data.reference_work_order_id, 51)
        self.assertEqual(response.data.suggested_next_due_at.year, 2027)
        self.assertEqual(
            suggestion_mock.call_args.kwargs,
            {"client_id": 11, "site_id": 31, "installation_id": 9},
        )

    def test_list_maintenance_status_logs_translates_missing_work_order_to_404(self) -> None:
        with patch(
            "app.apps.tenant_modules.maintenance.api.history.history_service.list_status_logs",
            side_effect=ValueError("La mantencion solicitada no existe"),
        ):
            with self.assertRaises(HTTPException) as exc:
                list_maintenance_status_logs(
                    work_order_id=99,
                    current_user=self._current_user(),
                    tenant_db=object(),
                )
        self.assertEqual(exc.exception.status_code, 404)

    def test_list_maintenance_visits_returns_items(self) -> None:
        visit = SimpleNamespace(
            id=2,
            work_order_id=12,
            visit_status="scheduled",
            scheduled_start_at=datetime(2026, 4, 3, 10, 0, tzinfo=timezone.utc),
            scheduled_end_at=None,
            actual_start_at=None,
            actual_end_at=None,
            assigned_tenant_user_id=3,
            assigned_group_label="Técnicos norte",
            notes="Programado",
            created_at=datetime(2026, 4, 3, 9, 0, tzinfo=timezone.utc),
            updated_at=datetime(2026, 4, 3, 9, 0, tzinfo=timezone.utc),
        )
        with patch(
            "app.apps.tenant_modules.maintenance.api.history.history_service.list_visits",
            return_value=[visit],
        ):
            response = list_maintenance_visits(
                work_order_id=12,
                current_user=self._current_user(),
                tenant_db=object(),
            )
        self.assertEqual(response.total, 1)
        self.assertEqual(response.data[0].visit_status, "scheduled")

    def test_list_maintenance_visits_catalog_returns_filtered_items(self) -> None:
        visit = SimpleNamespace(
            id=2,
            work_order_id=12,
            visit_status="scheduled",
            scheduled_start_at=datetime(2026, 4, 3, 10, 0, tzinfo=timezone.utc),
            scheduled_end_at=None,
            actual_start_at=None,
            actual_end_at=None,
            assigned_tenant_user_id=3,
            assigned_group_label="Técnicos norte",
            notes="Programado",
            created_at=datetime(2026, 4, 3, 9, 0, tzinfo=timezone.utc),
            updated_at=datetime(2026, 4, 3, 9, 0, tzinfo=timezone.utc),
        )
        with patch(
            "app.apps.tenant_modules.maintenance.api.visits.visit_service.list_visits",
            return_value=[visit],
        ) as list_mock:
            response = list_maintenance_visits_catalog(
                work_order_id=12,
                visit_status="scheduled",
                current_user=self._current_user(),
                tenant_db=object(),
            )
        self.assertEqual(response.total, 1)
        self.assertEqual(response.data[0].assigned_group_label, "Técnicos norte")
        self.assertEqual(
            list_mock.call_args.kwargs,
            {"work_order_id": 12, "visit_status": "scheduled"},
        )

    def test_create_maintenance_visit_translates_validation_error_to_400(self) -> None:
        with patch(
            "app.apps.tenant_modules.maintenance.api.visits.visit_service.create_visit",
            side_effect=ValueError("La mantencion seleccionada no existe"),
        ):
            with self.assertRaises(HTTPException) as exc:
                create_maintenance_visit(
                    payload=MaintenanceVisitCreateRequest(
                        work_order_id=99,
                        visit_status="scheduled",
                    ),
                    current_user=self._current_user(),
                    tenant_db=object(),
                )
        self.assertEqual(exc.exception.status_code, 400)

    def test_delete_maintenance_visit_returns_deleted_item(self) -> None:
        visit = SimpleNamespace(
            id=2,
            work_order_id=12,
            visit_status="scheduled",
            scheduled_start_at=datetime(2026, 4, 3, 10, 0, tzinfo=timezone.utc),
            scheduled_end_at=None,
            actual_start_at=None,
            actual_end_at=None,
            assigned_tenant_user_id=3,
            assigned_group_label="Técnicos norte",
            notes="Programado",
            created_at=datetime(2026, 4, 3, 9, 0, tzinfo=timezone.utc),
            updated_at=datetime(2026, 4, 3, 9, 0, tzinfo=timezone.utc),
        )
        with patch(
            "app.apps.tenant_modules.maintenance.api.visits.visit_service.delete_visit",
            return_value=visit,
        ):
            response = delete_maintenance_visit(
                visit_id=2,
                current_user=self._current_user(),
                tenant_db=object(),
            )
        self.assertEqual(response.data.work_order_id, 12)

    def test_delete_maintenance_work_order_returns_deleted_item(self) -> None:
        item = SimpleNamespace(
            id=12,
            client_id=11,
            site_id=31,
            installation_id=9,
            external_reference="WO-001",
            title="Mantención mensual",
            description=None,
            priority="normal",
            scheduled_for=None,
            cancellation_reason=None,
            closure_notes=None,
            assigned_tenant_user_id=3,
            maintenance_status="scheduled",
            requested_at=datetime(2026, 4, 2, 12, 0, tzinfo=timezone.utc),
            completed_at=None,
            cancelled_at=None,
            created_by_user_id=2,
            created_at=datetime(2026, 4, 2, 12, 0, tzinfo=timezone.utc),
            updated_at=datetime(2026, 4, 2, 12, 0, tzinfo=timezone.utc),
        )
        with patch(
            "app.apps.tenant_modules.maintenance.api.work_orders.work_order_service.delete_work_order",
            return_value=item,
        ):
            response = delete_maintenance_work_order(
                work_order_id=12,
                current_user=self._current_user(),
                tenant_db=object(),
            )
        self.assertEqual(response.data.id, 12)
