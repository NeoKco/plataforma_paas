import json

from sqlalchemy import text

from app.apps.tenant_modules.core.services.tenant_connection_service import (
    TenantConnectionService,
)
from app.common.db.control_database import ControlSessionLocal


TENANT_SLUG = "ieris-ltda"


def main() -> None:
    control_db = ControlSessionLocal()
    tenant_db = None
    try:
        connection_service = TenantConnectionService()
        tenant = connection_service.get_tenant_by_slug(control_db, TENANT_SLUG)
        if tenant is None:
            raise RuntimeError(f"Tenant {TENANT_SLUG} no encontrado")
        tenant_session_factory = connection_service.get_tenant_session(tenant)
        tenant_db = tenant_session_factory()
        rows = tenant_db.execute(
            text(
                """
                select
                    wo.id as work_order_id,
                    wo.title,
                    wo.task_type_id,
                    tt.name as task_type_name,
                    wo.scheduled_for,
                    wo.maintenance_status
                from maintenance_work_orders wo
                left join business_task_types tt on tt.id = wo.task_type_id
                where wo.maintenance_status in ('scheduled', 'in_progress')
                order by wo.id
                """
            )
        ).mappings().all()
        print(json.dumps([dict(row) for row in rows], default=str, ensure_ascii=False, indent=2))
    finally:
        if tenant_db is not None:
            tenant_db.close()
        control_db.close()


if __name__ == "__main__":
    main()
