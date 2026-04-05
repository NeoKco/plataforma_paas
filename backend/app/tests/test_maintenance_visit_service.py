import os
import unittest
from types import SimpleNamespace

os.environ["DEBUG"] = "true"
os.environ["APP_ENV"] = "test"

from app.apps.tenant_modules.business_core.models import (  # noqa: E402
    BusinessFunctionProfile,
    BusinessTaskType,
    BusinessWorkGroup,
    BusinessWorkGroupMember,
)
from app.apps.tenant_modules.core.models.user import User  # noqa: E402
from app.apps.tenant_modules.maintenance.models import (  # noqa: E402
    MaintenanceSchedule,
    MaintenanceWorkOrder,
)
from app.apps.tenant_modules.maintenance.schemas import MaintenanceVisitCreateRequest  # noqa: E402
from app.apps.tenant_modules.maintenance.services.visit_service import (  # noqa: E402
    MaintenanceVisitService,
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


class MaintenanceVisitServiceTestCase(unittest.TestCase):
    def test_create_visit_rejects_task_typed_assignment_without_function_profile(self) -> None:
        service = MaintenanceVisitService()
        tenant_db = _FakeTenantDb(
            {
                MaintenanceWorkOrder: SimpleNamespace(
                    id=91,
                    maintenance_status="scheduled",
                    schedule_id=14,
                ),
                BusinessWorkGroup: SimpleNamespace(id=5, name="Cuadrilla Norte"),
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
            service.create_visit(
                tenant_db,
                MaintenanceVisitCreateRequest(
                    work_order_id=91,
                    visit_status="scheduled",
                    scheduled_start_at="2026-04-10T16:00:00+00:00",
                    assigned_work_group_id=5,
                    assigned_tenant_user_id=3,
                ),
            )

    def test_create_visit_rejects_incompatible_function_profile_mapping(self) -> None:
        service = MaintenanceVisitService()
        tenant_db = _FakeTenantDb(
            {
                MaintenanceWorkOrder: SimpleNamespace(
                    id=91,
                    maintenance_status="scheduled",
                    schedule_id=14,
                ),
                BusinessWorkGroup: SimpleNamespace(id=5, name="Cuadrilla Norte"),
                User.id: SimpleNamespace(id=3),
                BusinessWorkGroupMember: SimpleNamespace(
                    id=20,
                    is_active=True,
                    starts_at=None,
                    ends_at=None,
                    function_profile_id=12,
                ),
                MaintenanceSchedule: SimpleNamespace(id=14, task_type_id=7),
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
            service.create_visit(
                tenant_db,
                MaintenanceVisitCreateRequest(
                    work_order_id=91,
                    visit_status="scheduled",
                    scheduled_start_at="2026-04-10T16:00:00+00:00",
                    assigned_work_group_id=5,
                    assigned_tenant_user_id=3,
                ),
            )


if __name__ == "__main__":
    unittest.main()