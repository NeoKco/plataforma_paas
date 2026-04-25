import os
import unittest
from types import SimpleNamespace
from unittest.mock import Mock

os.environ["DEBUG"] = "true"
os.environ["APP_ENV"] = "test"

from app.apps.tenant_modules.business_core.models import (  # noqa: E402
    BusinessClient,
    BusinessWorkGroup,
)
from app.apps.tenant_modules.core.models.user import User  # noqa: E402
from app.apps.tenant_modules.crm.models import CRMOpportunity  # noqa: E402
from app.apps.tenant_modules.maintenance.models import MaintenanceWorkOrder  # noqa: E402
from app.apps.tenant_modules.taskops.models import (  # noqa: E402
    TaskOpsTask,
    TaskOpsTaskStatusEvent,
)
from app.apps.tenant_modules.taskops.schemas import (  # noqa: E402
    TaskOpsTaskCreateRequest,
)
from app.apps.tenant_modules.taskops.services.task_service import (  # noqa: E402
    TaskOpsTaskService,
)


class TaskOpsServicesTestCase(unittest.TestCase):
    def test_task_rejects_invalid_status(self) -> None:
        service = TaskOpsTaskService()

        with self.assertRaises(ValueError) as exc:
            service.create_task(
                Mock(),
                TaskOpsTaskCreateRequest(
                    client_id=None,
                    opportunity_id=None,
                    work_order_id=None,
                    assigned_user_id=None,
                    assigned_work_group_id=None,
                    title="Nueva tarea",
                    description=None,
                    status="parking",
                    priority="normal",
                    due_at=None,
                    is_active=True,
                    sort_order=100,
                ),
            )

        self.assertIn("Estado de tarea inválido", str(exc.exception))

    def test_create_task_persists_status_event(self) -> None:
        tenant_db = Mock()
        tenant_db.get.side_effect = lambda model, item_id: (
            SimpleNamespace(id=item_id)
            if (
                (model is BusinessClient and item_id == 7)
                or (model is CRMOpportunity and item_id == 5)
                or (model is MaintenanceWorkOrder and item_id == 9)
                or (model is User and item_id == 3)
                or (model is BusinessWorkGroup and item_id == 4)
            )
            else None
        )

        added_items: list[object] = []

        def add_side_effect(item) -> None:
            added_items.append(item)

        def flush_side_effect() -> None:
            for item in added_items:
                if isinstance(item, TaskOpsTask) and getattr(item, "id", None) is None:
                    item.id = 77

        tenant_db.add.side_effect = add_side_effect
        tenant_db.flush.side_effect = flush_side_effect
        tenant_db.commit.return_value = None
        tenant_db.refresh.return_value = None

        service = TaskOpsTaskService()
        created = service.create_task(
            tenant_db,
            TaskOpsTaskCreateRequest(
                client_id=7,
                opportunity_id=5,
                work_order_id=9,
                assigned_user_id=3,
                assigned_work_group_id=4,
                title="Levantar presupuesto interno",
                description="Coordinar propuesta y revisión",
                status="todo",
                priority="high",
                due_at=None,
                is_active=True,
                sort_order=30,
            ),
            actor_user_id=3,
        )

        event_rows = [item for item in added_items if isinstance(item, TaskOpsTaskStatusEvent)]
        self.assertEqual(created.id, 77)
        self.assertEqual(created.client_id, 7)
        self.assertEqual(created.status, "todo")
        self.assertEqual(len(event_rows), 1)
        self.assertEqual(event_rows[0].task_id, 77)
        self.assertEqual(event_rows[0].event_type, "created")

    def test_set_task_status_done_marks_item_closed(self) -> None:
        task = TaskOpsTask(
            id=12,
            client_id=None,
            opportunity_id=None,
            work_order_id=None,
            assigned_user_id=None,
            assigned_work_group_id=None,
            title="Cerrar detalle técnico",
            description=None,
            status="in_progress",
            priority="normal",
            due_at=None,
            started_at=None,
            completed_at=None,
            created_by_user_id=None,
            updated_by_user_id=None,
            is_active=True,
            sort_order=100,
        )

        tenant_db = Mock()
        tenant_db.get.side_effect = lambda model, item_id: task if model is TaskOpsTask and item_id == 12 else None

        added_items: list[object] = []
        tenant_db.add.side_effect = lambda item: added_items.append(item)
        tenant_db.flush.return_value = None
        tenant_db.commit.return_value = None
        tenant_db.refresh.return_value = None

        service = TaskOpsTaskService()
        updated = service.set_task_status(
            tenant_db,
            12,
            "done",
            notes="Completada",
            actor_user_id=9,
        )

        event_rows = [item for item in added_items if isinstance(item, TaskOpsTaskStatusEvent)]
        self.assertEqual(updated.status, "done")
        self.assertFalse(updated.is_active)
        self.assertIsNotNone(updated.completed_at)
        self.assertEqual(len(event_rows), 1)
        self.assertEqual(event_rows[0].from_status, "in_progress")
        self.assertEqual(event_rows[0].to_status, "done")

    def test_attachment_rejects_unsupported_content_type(self) -> None:
        task = TaskOpsTask(
            id=22,
            client_id=None,
            opportunity_id=None,
            work_order_id=None,
            assigned_user_id=None,
            assigned_work_group_id=None,
            title="Subir respaldo",
            description=None,
            status="todo",
            priority="normal",
            due_at=None,
            started_at=None,
            completed_at=None,
            created_by_user_id=None,
            updated_by_user_id=None,
            is_active=True,
            sort_order=100,
        )
        tenant_db = Mock()
        tenant_db.get.side_effect = lambda model, item_id: task if model is TaskOpsTask and item_id == 22 else None

        service = TaskOpsTaskService()
        with self.assertRaises(ValueError) as exc:
            service.create_attachment(
                tenant_db,
                22,
                file_name="payload.exe",
                content_type="application/x-msdownload",
                content_bytes=b"abc",
                notes=None,
                actor_user_id=1,
            )

        self.assertIn("Tipo de archivo no soportado", str(exc.exception))

    def test_create_task_without_assign_permission_defaults_to_actor(self) -> None:
        tenant_db = Mock()
        tenant_db.get.side_effect = lambda model, item_id: (
            SimpleNamespace(id=item_id) if model is User and item_id == 8 else None
        )

        added_items: list[object] = []

        def add_side_effect(item) -> None:
            added_items.append(item)

        def flush_side_effect() -> None:
            for item in added_items:
                if isinstance(item, TaskOpsTask) and getattr(item, "id", None) is None:
                    item.id = 88

        tenant_db.add.side_effect = add_side_effect
        tenant_db.flush.side_effect = flush_side_effect
        tenant_db.commit.return_value = None
        tenant_db.refresh.return_value = None

        service = TaskOpsTaskService()
        created = service.create_task(
            tenant_db,
            TaskOpsTaskCreateRequest(
                client_id=None,
                opportunity_id=None,
                work_order_id=None,
                assigned_user_id=None,
                assigned_work_group_id=None,
                title="Tarea propia",
                description=None,
                status="todo",
                priority="normal",
                due_at=None,
                is_active=True,
                sort_order=10,
            ),
            actor_user_id=8,
            actor_can_assign_others=False,
        )

        self.assertEqual(created.assigned_user_id, 8)

    def test_create_task_rejects_assigning_others_without_permission(self) -> None:
        tenant_db = Mock()
        tenant_db.get.side_effect = lambda model, item_id: (
            SimpleNamespace(id=item_id) if model is User and item_id in {8, 9} else None
        )

        service = TaskOpsTaskService()
        with self.assertRaises(ValueError) as exc:
            service.create_task(
                tenant_db,
                TaskOpsTaskCreateRequest(
                    client_id=None,
                    opportunity_id=None,
                    work_order_id=None,
                    assigned_user_id=9,
                    assigned_work_group_id=None,
                    title="Asignación no permitida",
                    description=None,
                    status="todo",
                    priority="normal",
                    due_at=None,
                    is_active=True,
                    sort_order=10,
                ),
                actor_user_id=8,
                actor_can_assign_others=False,
            )

        self.assertIn("solo permite crear o editar tareas propias", str(exc.exception))

    def test_get_task_rejects_access_to_foreign_task_without_manage_all(self) -> None:
        task = TaskOpsTask(
            id=91,
            client_id=None,
            opportunity_id=None,
            work_order_id=None,
            assigned_user_id=33,
            assigned_work_group_id=None,
            title="Tarea ajena",
            description=None,
            status="todo",
            priority="normal",
            due_at=None,
            started_at=None,
            completed_at=None,
            created_by_user_id=44,
            updated_by_user_id=None,
            is_active=True,
            sort_order=100,
        )
        tenant_db = Mock()
        tenant_db.get.side_effect = lambda model, item_id: task if model is TaskOpsTask and item_id == 91 else None

        service = TaskOpsTaskService()
        with self.assertRaises(ValueError) as exc:
            service.get_task(
                tenant_db,
                91,
                actor_user_id=8,
                actor_can_manage_all=False,
            )

        self.assertIn("No tienes permisos para operar esta tarea", str(exc.exception))


if __name__ == "__main__":
    unittest.main()
