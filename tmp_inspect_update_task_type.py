from app.common.db.control_database import ControlSessionLocal
from app.apps.tenant_modules.core.services.tenant_connection_service import TenantConnectionService
from app.apps.tenant_modules.maintenance.models import MaintenanceWorkOrder
from app.apps.tenant_modules.maintenance.schemas.work_order import MaintenanceWorkOrderUpdateRequest
from app.apps.tenant_modules.maintenance.services.work_order_service import MaintenanceWorkOrderService

control = ControlSessionLocal()
conn = TenantConnectionService()
tenant = conn.get_tenant_by_slug(control, 'ieris-ltda')
factory = conn.get_tenant_session(tenant)
svc = MaintenanceWorkOrderService()
tenant_db = factory()
try:
    print('before')
    rows = tenant_db.query(MaintenanceWorkOrder).filter(MaintenanceWorkOrder.maintenance_status=='scheduled').order_by(MaintenanceWorkOrder.id.asc()).all()
    for row in rows:
        print(row.id, row.title, row.task_type_id, row.assigned_work_group_id, row.assigned_tenant_user_id)
    row = tenant_db.query(MaintenanceWorkOrder).filter(MaintenanceWorkOrder.id==345).first()
    payload = MaintenanceWorkOrderUpdateRequest(
        client_id=row.client_id,
        site_id=row.site_id,
        installation_id=row.installation_id,
        task_type_id=2,
        external_reference=row.external_reference,
        title=row.title,
        description=row.description,
        priority=row.priority,
        scheduled_for=row.scheduled_for,
        cancellation_reason=row.cancellation_reason,
        closure_notes=row.closure_notes,
        assigned_work_group_id=row.assigned_work_group_id,
        assigned_tenant_user_id=row.assigned_tenant_user_id,
    )
    updated = svc.update_work_order(tenant_db, 345, payload, changed_by_user_id=1, actor_role='admin')
    print('updated', updated.id, updated.task_type_id)
    tenant_db.expire_all()
    row = tenant_db.query(MaintenanceWorkOrder).filter(MaintenanceWorkOrder.id==345).first()
    print('after_single', row.id, row.task_type_id)
    rows = tenant_db.query(MaintenanceWorkOrder).filter(MaintenanceWorkOrder.maintenance_status=='scheduled').order_by(MaintenanceWorkOrder.id.asc()).all()
    print('after_all')
    for row in rows:
        print(row.id, row.title, row.task_type_id, row.assigned_work_group_id, row.assigned_tenant_user_id)
finally:
    tenant_db.close(); control.close()
