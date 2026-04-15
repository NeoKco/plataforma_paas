import os
import unittest
from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import Mock

os.environ["DEBUG"] = "true"
os.environ["APP_ENV"] = "test"

from app.apps.tenant_modules.business_core.models import (  # noqa: E402
    BusinessClient,
    BusinessFunctionProfile,
    BusinessSite,
    BusinessTaskType,
    BusinessWorkGroup,
    BusinessWorkGroupMember,
)
from app.apps.tenant_modules.core.models.user import User  # noqa: E402
from app.apps.tenant_modules.maintenance.models import (  # noqa: E402
    MaintenanceInstallation,
    MaintenanceSchedule,
)
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

    def add(self, _item):
        return None

    def flush(self):
        return None

    def commit(self):
        return None

    def refresh(self, _item):
        return None

    def rollback(self):
        return None


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

    def test_update_completed_work_order_allows_admin_to_adjust_completed_at_with_audit(self) -> None:
        previous_completed_at = datetime(2026, 4, 4, 18, 0, tzinfo=timezone.utc)
        new_completed_at = datetime(2026, 4, 4, 15, 30, tzinfo=timezone.utc)
        existing_item = SimpleNamespace(
            id=118,
            client_id=11,
            site_id=31,
            installation_id=9,
            schedule_id=5,
            external_reference="LEGACY-HIST-MAINT-118",
            title="Mantencion cerrada",
            description="Descripcion vieja",
            priority="normal",
            scheduled_for="2026-04-04T10:00:00",
            cancellation_reason=None,
            closure_notes="Cierre viejo",
            assigned_work_group_id=4,
            assigned_tenant_user_id=None,
            maintenance_status="completed",
            completed_at=previous_completed_at,
        )
        schedule = SimpleNamespace(
            id=5,
            frequency_value=6,
            frequency_unit="months",
            last_executed_at=previous_completed_at,
            next_due_at=None,
        )
        work_order_repository = Mock()
        work_order_repository.get_by_id.return_value = existing_item
        work_order_repository.save.side_effect = lambda _tenant_db, item: item
        status_log_repository = Mock()
        costing_service = Mock()
        service = MaintenanceWorkOrderService(
            work_order_repository=work_order_repository,
            status_log_repository=status_log_repository,
            costing_service=costing_service,
        )
        tenant_db = _FakeTenantDb({MaintenanceSchedule: schedule})

        item = service.update_work_order(
            tenant_db,
            118,
            MaintenanceWorkOrderUpdateRequest(
                client_id=11,
                site_id=31,
                installation_id=9,
                assigned_work_group_id=4,
                external_reference="WO-NO-IMPORTA",
                title="Intento de cambio",
                description="Descripcion corregida",
                priority="critical",
                scheduled_for=None,
                cancellation_reason=None,
                closure_notes="cierre corregido",
                completed_at_override=new_completed_at,
                closure_adjustment_note="Se cerró varias horas después por carga operativa",
            ),
            changed_by_user_id=7,
            actor_role="admin",
        )

        self.assertEqual(item.completed_at, new_completed_at)
        self.assertEqual(schedule.last_executed_at, new_completed_at)
        self.assertIsNotNone(schedule.next_due_at)
        status_log_repository.create.assert_called_once()
        self.assertIn(
            "Registro posterior al cierre original",
            status_log_repository.create.call_args.kwargs["note"],
        )
        costing_service.maybe_auto_sync_by_tenant_policy.assert_called_once()

    def test_update_completed_work_order_rejects_operator_completed_at_adjustment(self) -> None:
        existing_item = SimpleNamespace(
            id=119,
            client_id=11,
            site_id=31,
            installation_id=9,
            schedule_id=None,
            external_reference="LEGACY-HIST-MAINT-119",
            title="Mantencion cerrada",
            description="Descripcion vieja",
            priority="normal",
            scheduled_for="2026-04-04T10:00:00",
            cancellation_reason=None,
            closure_notes="Cierre viejo",
            assigned_work_group_id=4,
            assigned_tenant_user_id=None,
            maintenance_status="completed",
            completed_at=datetime(2026, 4, 4, 18, 0, tzinfo=timezone.utc),
        )
        work_order_repository = Mock()
        work_order_repository.get_by_id.return_value = existing_item
        work_order_repository.save.side_effect = lambda _tenant_db, item: item
        service = MaintenanceWorkOrderService(work_order_repository=work_order_repository)

        with self.assertRaisesRegex(
            ValueError,
            "Solo perfiles admin o manager pueden ajustar la fecha efectiva de cierre",
        ):
            service.update_work_order(
                _FakeTenantDb({}),
                119,
                MaintenanceWorkOrderUpdateRequest(
                    client_id=11,
                    site_id=31,
                    installation_id=9,
                    assigned_work_group_id=4,
                    external_reference="WO-NO-IMPORTA",
                    title="Intento de cambio",
                    description="Descripcion corregida",
                    priority="critical",
                    scheduled_for=None,
                    cancellation_reason=None,
                    closure_notes="cierre corregido",
                    completed_at_override=datetime(2026, 4, 4, 15, 30, tzinfo=timezone.utc),
                    closure_adjustment_note="Cierre tardío",
                ),
                changed_by_user_id=8,
                actor_role="operator",
            )

    def test_update_completed_work_order_retries_auto_sync_after_completed_at_adjustment(self) -> None:
        existing_item = SimpleNamespace(
            id=120,
            client_id=11,
            site_id=31,
            installation_id=9,
            schedule_id=None,
            external_reference="LEGACY-HIST-MAINT-120",
            title="Mantencion cerrada",
            description="Descripcion vieja",
            priority="normal",
            scheduled_for="2026-04-04T10:00:00",
            cancellation_reason=None,
            closure_notes="Cierre viejo",
            assigned_work_group_id=4,
            assigned_tenant_user_id=None,
            maintenance_status="completed",
            completed_at=datetime(2026, 4, 4, 18, 0, tzinfo=timezone.utc),
        )
        work_order_repository = Mock()
        work_order_repository.get_by_id.return_value = existing_item
        work_order_repository.save.side_effect = lambda _tenant_db, item: item
        costing_service = Mock()
        service = MaintenanceWorkOrderService(
            work_order_repository=work_order_repository,
            costing_service=costing_service,
        )

        service.update_work_order(
            _FakeTenantDb({}),
            120,
            MaintenanceWorkOrderUpdateRequest(
                client_id=11,
                site_id=31,
                installation_id=9,
                assigned_work_group_id=4,
                external_reference="WO-NO-IMPORTA",
                title="Intento de cambio",
                description="Descripcion corregida",
                priority="critical",
                scheduled_for=None,
                cancellation_reason=None,
                closure_notes="cierre corregido",
                completed_at_override=datetime(2026, 4, 4, 15, 30, tzinfo=timezone.utc),
                closure_adjustment_note="Cierre tardío",
            ),
            changed_by_user_id=8,
            actor_role="manager",
        )

        costing_service.maybe_auto_sync_by_tenant_policy.assert_called_once()

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
            Mock(filter=Mock(return_value=Mock(filter=Mock(return_value=Mock(first=Mock(return_value=SimpleNamespace(id=20, is_active=True, starts_at=None, ends_at=None))))))),
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

    def test_create_work_order_persists_direct_task_type_selection(self) -> None:
        work_order_repository = Mock()
        work_order_repository.save.side_effect = lambda _tenant_db, item: item
        status_log_repository = Mock()
        status_log_repository.create.return_value = None
        service = MaintenanceWorkOrderService(
            work_order_repository=work_order_repository,
            status_log_repository=status_log_repository,
        )
        tenant_db = _FakeTenantDb(
            {
                BusinessClient.id: SimpleNamespace(id=11),
                BusinessSite: SimpleNamespace(id=31, client_id=11),
                MaintenanceInstallation: SimpleNamespace(id=9, site_id=31),
                BusinessTaskType: SimpleNamespace(id=7, name="mantencion"),
            }
        )

        created = service.create_work_order(
            tenant_db,
            MaintenanceWorkOrderCreateRequest(
                client_id=11,
                site_id=31,
                installation_id=9,
                task_type_id=7,
                title="Mantencion mensual",
            ),
            created_by_user_id=1,
        )

        self.assertEqual(created.task_type_id, 7)

    def test_update_work_order_persists_direct_task_type_selection(self) -> None:
        existing_item = SimpleNamespace(
            id=12,
            client_id=11,
            site_id=31,
            installation_id=9,
            task_type_id=7,
            schedule_id=None,
            external_reference=None,
            title="Mantencion mensual",
            description=None,
            priority="normal",
            scheduled_for="2026-04-05T10:00:00+00:00",
            cancellation_reason=None,
            closure_notes=None,
            assigned_work_group_id=None,
            assigned_tenant_user_id=None,
            maintenance_status="scheduled",
        )
        work_order_repository = Mock()
        work_order_repository.get_by_id.return_value = existing_item
        work_order_repository.get_by_external_reference.return_value = None
        work_order_repository.list_active_conflicts.return_value = []
        work_order_repository.save.side_effect = lambda _tenant_db, item: item

        service = MaintenanceWorkOrderService(
            work_order_repository=work_order_repository,
        )
        tenant_db = _FakeTenantDb(
            {
                BusinessClient.id: SimpleNamespace(id=11),
                BusinessSite: SimpleNamespace(id=31, client_id=11),
                MaintenanceInstallation: SimpleNamespace(id=9, site_id=31),
                BusinessTaskType: SimpleNamespace(id=8, name="instalacion"),
            }
        )

        updated = service.update_work_order(
            tenant_db,
            12,
            MaintenanceWorkOrderUpdateRequest(
                client_id=11,
                site_id=31,
                installation_id=9,
                task_type_id=8,
                assigned_work_group_id=None,
                assigned_tenant_user_id=None,
                external_reference=None,
                title="Mantencion mensual",
                description=None,
                priority="normal",
                scheduled_for="2026-04-05T10:00:00+00:00",
            ),
        )

        self.assertEqual(updated.task_type_id, 8)

    def test_create_work_order_rejects_unknown_task_type(self) -> None:
        work_order_repository = Mock()
        service = MaintenanceWorkOrderService(
            work_order_repository=work_order_repository,
        )
        tenant_db = _FakeTenantDb(
            {
                BusinessClient.id: SimpleNamespace(id=11),
                BusinessSite: SimpleNamespace(id=31, client_id=11),
                MaintenanceInstallation: SimpleNamespace(id=9, site_id=31),
                BusinessTaskType: None,
            }
        )

        with self.assertRaisesRegex(
            ValueError,
            "tipo de tarea seleccionado no existe",
        ):
            service.create_work_order(
                tenant_db,
                MaintenanceWorkOrderCreateRequest(
                    client_id=11,
                    site_id=31,
                    installation_id=9,
                    task_type_id=999,
                    title="Mantencion mensual",
                ),
            )

    def test_create_work_order_rejects_technician_outside_group_membership(self) -> None:
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
                BusinessWorkGroup.id: SimpleNamespace(id=4),
                User.id: SimpleNamespace(id=3),
                BusinessWorkGroupMember: None,
            }
        )

        with self.assertRaisesRegex(
            ValueError,
            "no pertenece al grupo responsable indicado",
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
                ),
            )

    def test_create_work_order_rejects_inactive_group_membership(self) -> None:
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
                BusinessWorkGroup.id: SimpleNamespace(id=4),
                User.id: SimpleNamespace(id=3),
                BusinessWorkGroupMember: SimpleNamespace(
                    id=20,
                    is_active=False,
                    starts_at=None,
                    ends_at=None,
                ),
            }
        )

        with self.assertRaisesRegex(
            ValueError,
            "membresía activa",
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
                ),
            )

    def test_update_work_order_creates_reschedule_audit_log(self) -> None:
        existing_item = SimpleNamespace(
            id=12,
            client_id=11,
            site_id=31,
            installation_id=9,
            external_reference="WO-001",
            title="Mantencion mensual",
            description=None,
            priority="normal",
            scheduled_for="2026-04-05T10:00:00+00:00",
            cancellation_reason=None,
            closure_notes=None,
            assigned_work_group_id=4,
            assigned_tenant_user_id=3,
            maintenance_status="scheduled",
        )
        work_order_repository = Mock()
        work_order_repository.get_by_id.return_value = existing_item
        work_order_repository.get_by_external_reference.return_value = existing_item
        work_order_repository.list_active_conflicts.return_value = []
        work_order_repository.save.side_effect = lambda _tenant_db, item: item
        status_log_repository = Mock()
        status_log_repository.create.return_value = None

        service = MaintenanceWorkOrderService(
            work_order_repository=work_order_repository,
            status_log_repository=status_log_repository,
        )
        tenant_db = _FakeTenantDb(
            {
                BusinessClient.id: SimpleNamespace(id=11),
                BusinessSite: SimpleNamespace(id=31, client_id=11),
                MaintenanceInstallation: SimpleNamespace(id=9, site_id=31),
                BusinessWorkGroup.id: SimpleNamespace(id=4),
                User.id: SimpleNamespace(id=8),
                BusinessWorkGroupMember: SimpleNamespace(
                    id=20,
                    is_active=True,
                    starts_at=None,
                    ends_at=None,
                ),
            }
        )
        tenant_db.commit = Mock()
        tenant_db.refresh = Mock()

        item = service.update_work_order(
            tenant_db,
            12,
            MaintenanceWorkOrderUpdateRequest(
                client_id=11,
                site_id=31,
                installation_id=9,
                assigned_work_group_id=4,
                assigned_tenant_user_id=8,
                external_reference="WO-001",
                title="Mantencion mensual",
                description=None,
                priority="normal",
                scheduled_for="2026-04-05T12:30:00+00:00",
                reschedule_note="Cliente pidió cambio por acceso restringido",
            ),
            changed_by_user_id=21,
        )

        self.assertEqual(item.scheduled_for.isoformat(), "2026-04-05T12:30:00+00:00")
        status_log_repository.create.assert_called_once()
        self.assertEqual(status_log_repository.create.call_args.kwargs["work_order_id"], 12)
        self.assertEqual(status_log_repository.create.call_args.kwargs["from_status"], "scheduled")
        self.assertEqual(status_log_repository.create.call_args.kwargs["to_status"], "scheduled")
        self.assertEqual(status_log_repository.create.call_args.kwargs["changed_by_user_id"], 21)
        self.assertIn("Reprogramación:", status_log_repository.create.call_args.kwargs["note"])
        self.assertIn("Motivo: Cliente pidió cambio", status_log_repository.create.call_args.kwargs["note"])

    def test_update_schedule_linked_work_order_rejects_assignment_without_function_profile(self) -> None:
        existing_item = SimpleNamespace(
            id=12,
            client_id=11,
            site_id=31,
            installation_id=9,
            schedule_id=14,
            external_reference=None,
            title="Mantencion mensual",
            description=None,
            priority="normal",
            scheduled_for="2026-04-05T10:00:00+00:00",
            cancellation_reason=None,
            closure_notes=None,
            assigned_work_group_id=4,
            assigned_tenant_user_id=3,
            maintenance_status="scheduled",
        )
        work_order_repository = Mock()
        work_order_repository.get_by_id.return_value = existing_item
        work_order_repository.list_active_conflicts.return_value = []

        service = MaintenanceWorkOrderService(
            work_order_repository=work_order_repository,
        )
        tenant_db = _FakeTenantDb(
            {
                BusinessClient.id: SimpleNamespace(id=11),
                BusinessSite: SimpleNamespace(id=31, client_id=11),
                MaintenanceInstallation: SimpleNamespace(id=9, site_id=31),
                BusinessWorkGroup.id: SimpleNamespace(id=4),
                User.id: SimpleNamespace(id=3),
                BusinessWorkGroupMember: SimpleNamespace(
                    id=20,
                    is_active=True,
                    starts_at=None,
                    ends_at=None,
                    function_profile_id=None,
                ),
                MaintenanceSchedule: SimpleNamespace(id=14, task_type_id=7),
                BusinessTaskType: SimpleNamespace(
                    id=7,
                    name="Mantencion preventiva",
                    description=None,
                ),
            }
        )

        with self.assertRaisesRegex(
            ValueError,
            "perfil funcional declarado",
        ):
            service.update_work_order(
                tenant_db,
                12,
                MaintenanceWorkOrderUpdateRequest(
                    client_id=11,
                    site_id=31,
                    installation_id=9,
                    assigned_work_group_id=4,
                    assigned_tenant_user_id=3,
                    external_reference=None,
                    title="Mantencion mensual",
                    description=None,
                    priority="normal",
                    scheduled_for="2026-04-05T10:00:00+00:00",
                ),
            )

    def test_update_schedule_linked_work_order_rejects_incompatible_function_profile(self) -> None:
        existing_item = SimpleNamespace(
            id=12,
            client_id=11,
            site_id=31,
            installation_id=9,
            schedule_id=14,
            external_reference=None,
            title="Mantencion mensual",
            description=None,
            priority="normal",
            scheduled_for="2026-04-05T10:00:00+00:00",
            cancellation_reason=None,
            closure_notes=None,
            assigned_work_group_id=4,
            assigned_tenant_user_id=3,
            maintenance_status="scheduled",
        )
        work_order_repository = Mock()
        work_order_repository.get_by_id.return_value = existing_item
        work_order_repository.list_active_conflicts.return_value = []

        service = MaintenanceWorkOrderService(
            work_order_repository=work_order_repository,
        )
        tenant_db = _FakeTenantDb(
            {
                BusinessClient.id: SimpleNamespace(id=11),
                BusinessSite: SimpleNamespace(id=31, client_id=11),
                MaintenanceInstallation: SimpleNamespace(id=9, site_id=31),
                BusinessWorkGroup.id: SimpleNamespace(id=4),
                User.id: SimpleNamespace(id=3),
                BusinessWorkGroupMember: SimpleNamespace(
                    id=20,
                    is_active=True,
                    starts_at=None,
                    ends_at=None,
                    function_profile_id=15,
                ),
                MaintenanceSchedule: SimpleNamespace(id=14, task_type_id=7),
                BusinessTaskType: SimpleNamespace(
                    id=7,
                    name="Inspección SST",
                    description="profiles: Supervisor, Lider tecnico",
                ),
                BusinessFunctionProfile: SimpleNamespace(
                    id=15,
                    name="Tecnico",
                    code="tecnico",
                ),
            }
        )

        with self.assertRaisesRegex(
            ValueError,
            "solo permite perfiles funcionales compatibles",
        ):
            service.update_work_order(
                tenant_db,
                12,
                MaintenanceWorkOrderUpdateRequest(
                    client_id=11,
                    site_id=31,
                    installation_id=9,
                    assigned_work_group_id=4,
                    assigned_tenant_user_id=3,
                    external_reference=None,
                    title="Mantencion mensual",
                    description=None,
                    priority="normal",
                    scheduled_for="2026-04-05T10:00:00+00:00",
                ),
            )

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

    def test_update_work_order_status_completed_uses_explicit_finance_sync_payload(self) -> None:
        existing_item = SimpleNamespace(
            id=24,
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
            24,
            MaintenanceStatusUpdateRequest(
                maintenance_status="completed",
                note="Cierre operativo",
                finance_sync={
                    "sync_income": True,
                    "sync_expense": True,
                    "income_account_id": 1,
                    "expense_account_id": 1,
                    "income_category_id": 39,
                    "expense_category_id": 40,
                    "currency_id": 2,
                    "transaction_at": None,
                    "income_description": "Ingreso mantención #24 · SST · Cliente",
                    "expense_description": "Egreso mantención #24 · SST · Cliente",
                    "notes": "sync explicito",
                },
            ),
            changed_by_user_id=7,
        )

        self.assertEqual(updated.maintenance_status, "completed")
        costing_service.sync_to_finance.assert_called_once()
        sync_args = costing_service.sync_to_finance.call_args
        self.assertEqual(sync_args.args[0], tenant_db)
        self.assertEqual(sync_args.args[1], 24)
        self.assertEqual(sync_args.kwargs["actor_user_id"], 7)
        costing_service.maybe_auto_sync_by_tenant_policy.assert_not_called()

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
            Mock(filter=Mock(return_value=Mock(filter=Mock(return_value=Mock(first=Mock(return_value=SimpleNamespace(id=20, is_active=True, starts_at=None, ends_at=None))))))),
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

    def test_create_work_order_acquires_postgres_advisory_locks_before_conflict_check(self) -> None:
        work_order_repository = Mock()
        work_order_repository.get_by_external_reference.return_value = None
        work_order_repository.list_active_conflicts.return_value = []
        service = MaintenanceWorkOrderService(
            work_order_repository=work_order_repository,
        )
        tenant_db = Mock()
        tenant_db.bind = SimpleNamespace(dialect=SimpleNamespace(name="postgresql"))
        tenant_db.query.side_effect = [
            Mock(filter=Mock(return_value=Mock(first=Mock(return_value=SimpleNamespace(id=11))))),
            Mock(filter=Mock(return_value=Mock(first=Mock(return_value=SimpleNamespace(id=31, client_id=11))))),
            Mock(filter=Mock(return_value=Mock(first=Mock(return_value=SimpleNamespace(id=9, site_id=31))))),
            Mock(filter=Mock(return_value=Mock(first=Mock(return_value=SimpleNamespace(id=4))))),
            Mock(filter=Mock(return_value=Mock(first=Mock(return_value=SimpleNamespace(id=3))))),
            Mock(filter=Mock(return_value=Mock(filter=Mock(return_value=Mock(first=Mock(return_value=SimpleNamespace(id=20, is_active=True, starts_at=None, ends_at=None))))))),
        ]
        tenant_db.add.return_value = None
        tenant_db.flush.return_value = None
        tenant_db.commit.return_value = None
        tenant_db.refresh.return_value = None

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

        self.assertEqual(tenant_db.execute.call_count, 3)

    def test_activate_work_order_status_acquires_postgres_advisory_locks(self) -> None:
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
        work_order_repository.list_active_conflicts.return_value = []
        service = MaintenanceWorkOrderService(
            work_order_repository=work_order_repository,
            status_log_repository=Mock(),
            visit_repository=Mock(),
            costing_service=Mock(),
        )
        tenant_db = Mock()
        tenant_db.bind = SimpleNamespace(dialect=SimpleNamespace(name="postgresql"))
        tenant_db.add.return_value = None
        tenant_db.commit.return_value = None
        tenant_db.refresh.return_value = None

        service.update_work_order_status(
            tenant_db,
            23,
            MaintenanceStatusUpdateRequest(
                maintenance_status="scheduled",
                note="Reabrir",
            ),
            changed_by_user_id=7,
            actor_role="admin",
        )

        self.assertEqual(tenant_db.execute.call_count, 3)

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
                actor_role="admin",
            )

    def test_reopen_work_order_status_rejects_non_admin_profiles(self) -> None:
        existing_item = SimpleNamespace(
            id=23,
            maintenance_status="completed",
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
        service = MaintenanceWorkOrderService(
            work_order_repository=work_order_repository,
            status_log_repository=Mock(),
            visit_repository=Mock(),
            costing_service=Mock(),
        )

        with self.assertRaisesRegex(
            ValueError,
            "Solo perfiles administrativos pueden reabrir mantenciones desde historial",
        ):
            service.update_work_order_status(
                Mock(),
                23,
                MaintenanceStatusUpdateRequest(
                    maintenance_status="scheduled",
                    note="Reabrir",
                ),
                changed_by_user_id=7,
                actor_role="operator",
            )


if __name__ == "__main__":
    unittest.main()
