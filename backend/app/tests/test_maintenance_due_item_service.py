import os
import unittest
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import Mock

os.environ["DEBUG"] = "true"
os.environ["APP_ENV"] = "test"

from app.apps.tenant_modules.business_core.models import (  # noqa: E402
    BusinessFunctionProfile,
    BusinessTaskType,
    BusinessWorkGroup,
    BusinessWorkGroupMember,
)
from app.apps.tenant_modules.core.models.user import User  # noqa: E402
from app.apps.tenant_modules.maintenance.services.due_item_service import (  # noqa: E402
    MaintenanceDueItemService,
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


class MaintenanceDueItemServiceTestCase(unittest.TestCase):
    def test_generate_due_items_creates_visible_due_item(self) -> None:
        now = datetime(2026, 4, 4, 12, 0, tzinfo=timezone.utc)
        schedule = SimpleNamespace(
            id=14,
            client_id=8,
            site_id=22,
            installation_id=4,
            next_due_at=now + timedelta(days=2),
            lead_days=5,
            is_active=True,
            auto_create_due_items=True,
        )

        schedule_repository = Mock()
        schedule_repository.list_active.return_value = [schedule]
        due_item_repository = Mock()
        due_item_repository.get_open_for_cycle.return_value = None
        due_item_repository.save.side_effect = lambda _tenant_db, item: item

        service = MaintenanceDueItemService(
            due_item_repository=due_item_repository,
            schedule_repository=schedule_repository,
        )

        generated = service.generate_due_items(object(), now=now)

        self.assertEqual(len(generated), 1)
        self.assertEqual(generated[0].schedule_id, 14)
        self.assertEqual(generated[0].client_id, 8)
        self.assertEqual(generated[0].site_id, 22)
        self.assertEqual(generated[0].installation_id, 4)
        self.assertEqual(generated[0].due_status, "upcoming")
        self.assertEqual(generated[0].contact_status, "not_contacted")
        due_item_repository.get_open_for_cycle.assert_called_once()
        due_item_repository.save.assert_called_once()

    def test_schedule_due_item_links_work_order_and_marks_item_scheduled(self) -> None:
        due_item = SimpleNamespace(
            id=31,
            schedule_id=14,
            client_id=8,
            site_id=22,
            installation_id=4,
            due_at=datetime(2026, 4, 10, 15, 0, tzinfo=timezone.utc),
            visible_from=datetime(2026, 4, 1, 15, 0, tzinfo=timezone.utc),
            due_status="due",
            assigned_work_group_id=None,
            assigned_tenant_user_id=None,
            work_order_id=None,
        )
        schedule = SimpleNamespace(
            id=14,
            client_id=8,
            site_id=22,
            installation_id=4,
            name="Mantención semestral SST",
            description="Control preventivo",
            default_priority="normal",
            billing_mode="per_work_order",
            task_type_id=7,
        )
        created_work_order = SimpleNamespace(
            id=91,
            client_id=8,
            site_id=22,
            installation_id=4,
            assigned_work_group_id=5,
            assigned_tenant_user_id=3,
            billing_mode="per_work_order",
        )

        due_item_repository = Mock()
        due_item_repository.get_by_id.return_value = due_item
        due_item_repository.save.side_effect = lambda _tenant_db, item: item
        schedule_repository = Mock()
        schedule_repository.get_by_id.return_value = schedule
        work_order_repository = Mock()
        work_order_repository.save.side_effect = lambda _tenant_db, item: item
        work_order_service = Mock()
        work_order_service.create_work_order.return_value = created_work_order
        costing_service = Mock()

        service = MaintenanceDueItemService(
            due_item_repository=due_item_repository,
            schedule_repository=schedule_repository,
            work_order_repository=work_order_repository,
            work_order_service=work_order_service,
            costing_service=costing_service,
        )
        tenant_db = _FakeTenantDb(
            {
                BusinessWorkGroup.id: SimpleNamespace(id=5),
                User.id: SimpleNamespace(id=3),
            }
        )

        saved_due_item, saved_work_order = service.schedule_due_item(
            tenant_db,
            31,
            SimpleNamespace(
                scheduled_for=datetime(2026, 4, 10, 16, 0, tzinfo=timezone.utc),
                site_id=22,
                installation_id=4,
                title="Mantención SST abril",
                description="Visita ya coordinada",
                priority="high",
                assigned_work_group_id=5,
                assigned_tenant_user_id=3,
            ),
            created_by_user_id=2,
        )

        self.assertIs(saved_work_order, created_work_order)
        self.assertEqual(saved_work_order.schedule_id, 14)
        self.assertEqual(saved_work_order.due_item_id, 31)
        self.assertEqual(saved_due_item.work_order_id, 91)
        self.assertEqual(saved_due_item.due_status, "scheduled")
        self.assertEqual(saved_due_item.assigned_work_group_id, 5)
        self.assertEqual(saved_due_item.assigned_tenant_user_id, 3)
        work_order_service.create_work_order.assert_called_once()
        costing_service.seed_estimate_from_schedule.assert_called_once_with(
            tenant_db,
            91,
            14,
            actor_user_id=2,
        )
        work_order_repository.save.assert_called_once()
        due_item_repository.save.assert_called_once()

    def test_schedule_due_item_rejects_task_typed_assignment_without_function_profile(self) -> None:
        due_item = SimpleNamespace(
            id=31,
            schedule_id=14,
            client_id=8,
            site_id=22,
            installation_id=4,
            due_at=datetime(2026, 4, 10, 15, 0, tzinfo=timezone.utc),
            visible_from=datetime(2026, 4, 1, 15, 0, tzinfo=timezone.utc),
            due_status="due",
            assigned_work_group_id=None,
            assigned_tenant_user_id=None,
            work_order_id=None,
        )
        schedule = SimpleNamespace(
            id=14,
            client_id=8,
            site_id=22,
            installation_id=4,
            name="Mantención semestral SST",
            description="Control preventivo",
            default_priority="normal",
            billing_mode="per_work_order",
            task_type_id=7,
        )

        due_item_repository = Mock()
        due_item_repository.get_by_id.return_value = due_item
        schedule_repository = Mock()
        schedule_repository.get_by_id.return_value = schedule
        work_order_service = Mock()

        service = MaintenanceDueItemService(
            due_item_repository=due_item_repository,
            schedule_repository=schedule_repository,
            work_order_service=work_order_service,
        )
        tenant_db = _FakeTenantDb(
            {
                BusinessWorkGroup.id: SimpleNamespace(id=5),
                User.id: SimpleNamespace(id=3),
                BusinessWorkGroupMember: SimpleNamespace(
                    id=20,
                    function_profile_id=None,
                ),
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
            service.schedule_due_item(
                tenant_db,
                31,
                SimpleNamespace(
                    scheduled_for=datetime(2026, 4, 10, 16, 0, tzinfo=timezone.utc),
                    site_id=22,
                    installation_id=4,
                    title="Mantención SST abril",
                    description="Visita ya coordinada",
                    priority="high",
                    assigned_work_group_id=5,
                    assigned_tenant_user_id=3,
                ),
                created_by_user_id=2,
            )

        work_order_service.create_work_order.assert_not_called()

    def test_schedule_due_item_rejects_incompatible_function_profile_mapping(self) -> None:
        due_item = SimpleNamespace(
            id=31,
            schedule_id=14,
            client_id=8,
            site_id=22,
            installation_id=4,
            due_at=datetime(2026, 4, 10, 15, 0, tzinfo=timezone.utc),
            visible_from=datetime(2026, 4, 1, 15, 0, tzinfo=timezone.utc),
            due_status="due",
            assigned_work_group_id=None,
            assigned_tenant_user_id=None,
            work_order_id=None,
        )
        schedule = SimpleNamespace(
            id=14,
            client_id=8,
            site_id=22,
            installation_id=4,
            name="Mantención SST",
            description="profiles: Supervisor, Lider tecnico",
            default_priority="normal",
            billing_mode="per_work_order",
            task_type_id=7,
        )

        service = MaintenanceDueItemService(
            due_item_repository=Mock(get_by_id=Mock(return_value=due_item)),
            schedule_repository=Mock(get_by_id=Mock(return_value=schedule)),
            work_order_service=Mock(),
        )
        tenant_db = _FakeTenantDb(
            {
                BusinessWorkGroup.id: SimpleNamespace(id=5),
                User.id: SimpleNamespace(id=3),
                BusinessWorkGroupMember: SimpleNamespace(
                    id=20,
                    function_profile_id=12,
                ),
                BusinessTaskType: SimpleNamespace(
                    id=7,
                    name="Inspección SST",
                    description="profiles: Supervisor, Lider tecnico",
                ),
                BusinessFunctionProfile: SimpleNamespace(
                    id=12,
                    name="Tecnico",
                    code="tecnico",
                ),
            }
        )

        with self.assertRaisesRegex(
            ValueError,
            "solo permite perfiles funcionales compatibles",
        ):
            service.schedule_due_item(
                tenant_db,
                31,
                SimpleNamespace(
                    scheduled_for=datetime(2026, 4, 10, 16, 0, tzinfo=timezone.utc),
                    site_id=22,
                    installation_id=4,
                    title="Mantención SST abril",
                    description="Visita ya coordinada",
                    priority="high",
                    assigned_work_group_id=5,
                    assigned_tenant_user_id=3,
                ),
                created_by_user_id=2,
            )


if __name__ == "__main__":
    unittest.main()
