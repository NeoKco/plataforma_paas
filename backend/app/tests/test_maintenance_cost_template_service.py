import os
import unittest
from types import SimpleNamespace
from unittest.mock import Mock

os.environ["DEBUG"] = "true"
os.environ["APP_ENV"] = "test"

from app.apps.tenant_modules.maintenance.schemas import (  # noqa: E402
    MaintenanceCostTemplateCreateRequest,
)
from app.apps.tenant_modules.maintenance.services.cost_template_service import (  # noqa: E402
    MaintenanceCostTemplateService,
)


class MaintenanceCostTemplateServiceTestCase(unittest.TestCase):
    def test_create_template_persists_lines_and_margin(self) -> None:
        tenant_db = Mock()
        empty_lines_query = Mock()
        empty_lines_query.filter.return_value = empty_lines_query
        empty_lines_query.order_by.return_value = empty_lines_query
        empty_lines_query.all.return_value = []
        saved_lines_query = Mock()
        saved_lines_query.filter.return_value = saved_lines_query
        saved_lines_query.order_by.return_value = saved_lines_query
        saved_lines_query.all.return_value = [SimpleNamespace(id=1), SimpleNamespace(id=2)]
        tenant_db.query.side_effect = [empty_lines_query, saved_lines_query]
        tenant_db.add.return_value = None
        tenant_db.flush.return_value = None
        tenant_db.commit.return_value = None
        tenant_db.refresh.side_effect = lambda item: None

        service = MaintenanceCostTemplateService()

        created = service.create_template(
            tenant_db,
            MaintenanceCostTemplateCreateRequest(
                name="Plan SST trimestral",
                description="Base para mantención preventiva SST",
                task_type_id=None,
                estimate_target_margin_percent=18,
                estimate_notes="Usar insumos homologados",
                is_active=True,
                lines=[
                    {
                        "line_type": "material",
                        "description": "Filtro",
                        "quantity": 2,
                        "unit_cost": 3500,
                        "notes": None,
                    },
                    {
                        "line_type": "service",
                        "description": "Calibración externa",
                        "quantity": 1,
                        "unit_cost": 12000,
                        "notes": "Proveedor homologado",
                    },
                ],
            ),
            created_by_user_id=7,
        )

        self.assertEqual(created.name, "Plan SST trimestral")
        self.assertEqual(created.estimate_target_margin_percent, 18)
        self.assertEqual(created.estimate_notes, "Usar insumos homologados")
        self.assertEqual(len(created.lines), 2)

    def test_create_template_requires_lines(self) -> None:
        tenant_db = Mock()
        service = MaintenanceCostTemplateService()

        with self.assertRaisesRegex(ValueError, "al menos una línea"):
            service.create_template(
                tenant_db,
                MaintenanceCostTemplateCreateRequest(
                    name="Plantilla vacía",
                    description=None,
                    task_type_id=None,
                    estimate_target_margin_percent=0,
                    estimate_notes=None,
                    is_active=True,
                    lines=[],
                ),
                created_by_user_id=9,
            )


if __name__ == "__main__":
    unittest.main()
