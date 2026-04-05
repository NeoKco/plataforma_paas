import os
import unittest
from types import SimpleNamespace
from unittest.mock import Mock

os.environ["DEBUG"] = "true"
os.environ["APP_ENV"] = "test"

from app.apps.tenant_modules.business_core.models import (  # noqa: E402
    BusinessClient,
    BusinessSite,
    BusinessWorkGroup,
)
from app.apps.tenant_modules.core.models.user import User  # noqa: E402
from app.apps.tenant_modules.maintenance.models import MaintenanceInstallation  # noqa: E402
from app.apps.tenant_modules.maintenance.schemas import (  # noqa: E402
    MaintenanceStatusUpdateRequest,
    MaintenanceWorkOrderCreateRequest,
    MaintenanceWorkOrderUpdateRequest,
)
from app.apps.tenant_modules.maintenance.services.work_order_service import (  # noqa: E402
    MaintenanceWorkOrderConflictError,
    MaintenanceWorkOrderService,
)


class _FakeQuery:
    def __init__(self, target, mapping):
        self.target = target
        self.mapping = mapping

    def filter(self, *_args, **_kwargs):
        return self

    def first(self):
        return self.mapping.get(self.target)


class _FakeTenantDb:
    def __init__(self, mapping):
        self.mapping = mapping

    def query(self, target):
        return _FakeQuery(target, self.mapping)


class MaintenanceWorkOrderServiceTestCase(unittest.TestCase):
    def test_update_work_order_preserves_existing_internal_external_reference(self) -> None:
        existing_item = SimpleNamespace(
            id=12,
            client_id=11,
            site_id=31,
            installation_id=9,
            external_reference="LEGACY-HIST-MAINT-34",
            title="Mantencion mensual",
            description=None,
            priority="normal",
            scheduled_for=None,
            cancellation_reason=None,
            closure_notes=None,
            assigned_work_group_id=None,
            assigned_tenant_user_id=None,
            maintenance_status="scheduled",
        )
        work_order_repository = Mock()
        work_order_repository.get_by_id.return_value = existing_item
        work_order_repository.get_by_external_reference.return_value = existing_item
        work_order_repository.save.side_effect = lambda _tenant_db, item: item

        service = MaintenanceWorkOrderService(
            work_order_repository=work_order_repository,
        )
        tenant_db = _FakeTenantDb(
            {
                BusinessClient.id: SimpleNamespace(id=11),
                BusinessSite: SimpleNamespace(id=31, client_id=11),
                MaintenanceInstallation: SimpleNamespace(id=9, site_id=31),
            }
        )

        item = service.update_work_order(
            tenant_db,
            12,
            MaintenanceWorkOrderUpdateRequest(
                client_id=11,
                site_id=31,
                    installation_id=9,
                    assigned_work_group_id=None,
                    external_reference="WO-EDITABLE-001",
                title="Mantencion mensual ajustada",
                description="Detalle corregido",
                priority="high",
            ),
        )

        self.assertEqual(item.external_reference, "LEGACY-HIST-MAINT-34")
        self.assertEqual(item.title, "Mantencion mensual ajustada")

    def test_create_work_order_requires_installation(self) -> None:
        work_order_repository = Mock()
        service = MaintenanceWorkOrderService(
            work_order_repository=work_order_repository,
        )
        tenant_db = _FakeTenantDb(
            {
                BusinessClient.id: SimpleNamespace(id=11),
                BusinessSite: SimpleNamespace(id=31, client_id=11),
            }
        )

        with self.assertRaisesRegex(
            ValueError,
            "Debes seleccionar una instalacion antes de agendar la mantencion",
        ):
            service.create_work_order(
                tenant_db,
                MaintenanceWorkOrderCreateRequest(
                    client_id=11,
                    site_id=31,
                    installation_id=None,
                    assigned_work_group_id=None,
                    title="Mantencion mensual",
                ),
            )

    def test_create_work_order_rejects_manual_legacy_external_reference(self) -> None:
        work_order_repository = Mock()
        work_order_repository.get_by_external_reference.return_value = None
        service = MaintenanceWorkOrderService(
            work_order_repository=work_order_repository,
        )
        tenant_db = _FakeTenantDb(
            {
                BusinessClient.id: SimpleNamespace(id=11),
                BusinessSite: SimpleNamespace(id=31, client_id=11),
                MaintenanceInstallation: SimpleNamespace(id=9, site_id=31),
            }
        )

        with self.assertRaisesRegex(
            ValueError,
            "La referencia externa legacy es interna y no puede capturarse manualmente",
        ):
            service.create_work_order(
                tenant_db,
                MaintenanceWorkOrderCreateRequest(
                    client_id=11,
                    site_id=31,
                    installation_id=9,
                    assigned_work_group_id=None,
                    external_reference="LEGACY-HIST-MAINT-34",
                    title="Mantencion mensual",
                ),
            )

    def test_update_closed_work_order_only_changes_closure_fields(self) -> None:
        existing_item = SimpleNamespace(
            id=18,
            client_id=11,
            site_id=31,
            installation_id=9,
            external_reference="LEGACY-HIST-MAINT-18",
            title="Mantencion cerrada",
            description="Descripcion vieja",
            priority="normal",
            scheduled_for="2026-04-04T10:00:00",
            cancellation_reason=None,
            closure_notes="Cierre viejo",
            assigned_work_group_id=4,
            assigned_tenant_user_id=None,
            maintenance_status="completed",
        )
        work_order_repository = Mock()
        work_order_repository.get_by_id.return_value = existing_item
        work_order_repository.save.side_effect = lambda _tenant_db, item: item

        service = MaintenanceWorkOrderService(
            work_order_repository=work_order_repository,
        )

        item = service.update_work_order(
            object(),
            18,
            MaintenanceWorkOrderUpdateRequest(
                client_id=999,
                site_id=999,
                installation_id=999,
                assigned_work_group_id=9,
                external_reference="WO-NO-IMPORTA",
                title="Intento de cambio",
                description="Descripcion corregida",
                priority="critical",
                scheduled_for=None,
                cancellation_reason="motivo nuevo",
                closure_notes="cierre corregido",
            ),
        )

        self.assertEqual(item.description, "Descripcion corregida")
        self.assertEqual(item.closure_notes, "cierre corregido")
        self.assertEqual(item.cancellation_reason, "motivo nuevo")
        self.assertEqual(item.assigned_work_group_id, 4)
        self.assertEqual(item.client_id, 11)
        self.assertEqual(item.site_id, 31)
        self.assertEqual(item.installation_id, 9)
        self.assertEqual(item.scheduled_for, "2026-04-04T10:00:00")
        self.assertEqual(item.title, "Mantencion cerrada")

    def test_create_work_order_rejects_unknown_assigned_work_group(self) -> None:
        work_order_repository = Mock()
        service = MaintenanceWorkOrderService(
            work_order_repository=work_order_repository,
        )
        tenant_db = _FakeTenantDb(
            {
                BusinessClient.id: SimpleNamespace(id=11),
                BusinessSite: SimpleNamespace(id=31, client_id=11),
                MaintenanceInstallation: SimpleNamespace(id=9, site_id=31),
                BusinessWorkGroup.id: None,
            }
        )

        with self.assertRaisesRegex(
            ValueError,
            "grupo responsable seleccionado no existe",
        ):
            service.create_work_order(
                tenant_db,
                MaintenanceWorkOrderCreateRequest(
                    client_id=11,
                    site_id=31,
                    installation_id=9,
                    assigned_work_group_id=999,
                    title="Mantencion mensual",
                ),
            )

    def test_create_work_order_accepts_group_and_technician_assignment(self) -> None:
        work_order_repository = Mock()
        work_order_repository.save.side_effect = lambda _tenant_db, item: item
        status_log_repository = Mock()
        status_log_repository.create.return_value = None
        service = MaintenanceWorkOrderService(
            work_order_repository=work_order_repository,
            status_log_repository=status_log_repository,
        )
        tenant_db = Mock()
        tenant_db.query.side_effect = [
            Mock(filter=Mock(return_value=Mock(first=Mock(return_value=SimpleNamespace(id=11))))),
            Mock(filter=Mock(return_value=Mock(first=Mock(return_value=SimpleNamespace(id=31, client_id=11))))),
            Mock(filter=Mock(return_value=Mock(first=Mock(return_value=SimpleNamespace(id=9, site_id=31))))),
            Mock(filter=Mock(return_value=Mock(first=Mock(return_value=SimpleNamespace(id=4))))),
            Mock(filter=Mock(return_value=Mock(first=Mock(return_value=SimpleNamespace(id=3))))),
        ]
        tenant_db.add.return_value = None
        tenant_db.flush.return_value = None
        tenant_db.commit.return_value = None
        tenant_db.refresh.side_effect = lambda item: None

        created = service.create_work_order(
            tenant_db,
            MaintenanceWorkOrderCreateRequest(
                client_id=11,
                site_id=31,
                installation_id=9,
                assigned_work_group_id=4,
                assigned_tenant_user_id=3,
                title="Mantencion mensual",
            ),
            created_by_user_id=1,
        )

        self.assertEqual(created.assigned_work_group_id, 4)
        self.assertEqual(created.assigned_tenant_user_id, 3)

    def test_complete_work_order_triggers_auto_sync_policy_check(self) -> None:
        existing_item = SimpleNamespace(
            id=23,
            maintenance_status="scheduled",
            completed_at=None,
            cancelled_at=None,
            due_item_id=None,
            schedule_id=None,
        )
        work_order_repository = Mock()
        work_order_repository.get_by_id.return_value = existing_item
        status_log_repository = Mock()
        visit_repository = Mock()
        costing_service = Mock()
        service = MaintenanceWorkOrderService(
            work_order_repository=work_order_repository,
            status_log_repository=status_log_repository,
            visit_repository=visit_repository,
            costing_service=costing_service,
        )
        tenant_db = Mock()
        tenant_db.add.return_value = None
        tenant_db.commit.return_value = None
        tenant_db.refresh.return_value = None

        updated = service.update_work_order_status(
            tenant_db,
            23,
            MaintenanceStatusUpdateRequest(
                maintenance_status="completed",
                note="Cierre operativo",
            ),
            changed_by_user_id=7,
        )

        self.assertEqual(updated.maintenance_status, "completed")
        costing_service.maybe_auto_sync_by_tenant_policy.assert_called_once_with(
            tenant_db,
            23,
            actor_user_id=7,
        )

    def test_create_work_order_rejects_conflicting_active_slot(self) -> None:
        work_order_repository = Mock()
        work_order_repository.get_by_external_reference.return_value = None
        work_order_repository.list_active_conflicts.return_value = [
            SimpleNamespace(
                id=77,
                installation_id=9,
                assigned_work_group_id=4,
                assigned_tenant_user_id=3,
            )
        ]
        service = MaintenanceWorkOrderService(
            work_order_repository=work_order_repository,
        )
        tenant_db = Mock()
        tenant_db.query.side_effect = [
            Mock(filter=Mock(return_value=Mock(first=Mock(return_value=SimpleNamespace(id=11))))),
            Mock(filter=Mock(return_value=Mock(first=Mock(return_value=SimpleNamespace(id=31, client_id=11))))),
            Mock(filter=Mock(return_value=Mock(first=Mock(return_value=SimpleNamespace(id=9, site_id=31))))),
            Mock(filter=Mock(return_value=Mock(first=Mock(return_value=SimpleNamespace(id=4))))),
            Mock(filter=Mock(return_value=Mock(first=Mock(return_value=SimpleNamespace(id=3))))),
        ]

        with self.assertRaisesRegex(
            MaintenanceWorkOrderConflictError,
            "El horario seleccionado ya cruza con 1 mantención",
        ):
            service.create_work_order(
                tenant_db,
                MaintenanceWorkOrderCreateRequest(
                    client_id=11,
                    site_id=31,
                    installation_id=9,
                    assigned_work_group_id=4,
                    assigned_tenant_user_id=3,
                    title="Mantencion mensual",
                    scheduled_for="2026-04-05T10:00:00+00:00",
                ),
            )

    def test_activate_work_order_status_rejects_conflicting_slot(self) -> None:
        existing_item = SimpleNamespace(
            id=23,
            maintenance_status="cancelled",
            completed_at=None,
            cancelled_at=None,
            due_item_id=None,
            schedule_id=None,
            scheduled_for="2026-04-05T10:00:00+00:00",
            installation_id=9,
            assigned_work_group_id=4,
            assigned_tenant_user_id=3,
        )
        work_order_repository = Mock()
        work_order_repository.get_by_id.return_value = existing_item
        work_order_repository.list_active_conflicts.return_value = [
            SimpleNamespace(
                id=81,
                installation_id=9,
                assigned_work_group_id=4,
                assigned_tenant_user_id=3,
            )
        ]
        service = MaintenanceWorkOrderService(
            work_order_repository=work_order_repository,
            status_log_repository=Mock(),
            visit_repository=Mock(),
            costing_service=Mock(),
        )

        with self.assertRaisesRegex(
            MaintenanceWorkOrderConflictError,
            "grupo responsable",
        ):
            service.update_work_order_status(
                Mock(),
                23,
                MaintenanceStatusUpdateRequest(
                    maintenance_status="scheduled",
                    note="Reabrir",
                ),
                changed_by_user_id=7,
            )


if __name__ == "__main__":
    unittest.main()
