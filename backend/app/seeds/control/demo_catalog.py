from datetime import datetime, timedelta, timezone
import json


def build_demo_tenant_specs(available_plan_codes: list[str]) -> list[dict]:
    now = datetime.now(timezone.utc)

    def pick_plan(index: int) -> str | None:
        if not available_plan_codes:
            return None
        if index < len(available_plan_codes):
            return available_plan_codes[index]
        return available_plan_codes[-1]

    return [
        {
            "name": "Condominio Demo",
            "slug": "condominio-demo",
            "tenant_type": "condos",
            "plan_code": pick_plan(0),
            "status": "active",
            "status_reason": None,
            "billing_provider": "stripe",
            "billing_provider_customer_id": "cus_demo_condominio",
            "billing_provider_subscription_id": "sub_demo_condominio",
            "billing_status": "active",
            "billing_status_reason": "Suscripcion activa de demo",
            "billing_current_period_ends_at": now + timedelta(days=27),
            "billing_grace_until": None,
            "maintenance_mode": False,
            "maintenance_starts_at": None,
            "maintenance_ends_at": None,
            "maintenance_reason": None,
            "maintenance_scopes": None,
            "maintenance_access_mode": "write_block",
            "api_read_requests_per_minute": 180,
            "api_write_requests_per_minute": 90,
            "module_limits_json": json.dumps(
                {
                    "core.users": 12,
                    "core.users.active": 8,
                    "finance.entries": 120,
                    "finance.entries.monthly": 40,
                },
                sort_keys=True,
            ),
        },
        {
            "name": "Empresa en Gracia",
            "slug": "empresa-gracia",
            "tenant_type": "empresa",
            "plan_code": pick_plan(1),
            "status": "active",
            "status_reason": None,
            "billing_provider": "stripe",
            "billing_provider_customer_id": "cus_demo_gracia",
            "billing_provider_subscription_id": "sub_demo_gracia",
            "billing_status": "past_due",
            "billing_status_reason": "Pago pendiente, aun dentro de gracia",
            "billing_current_period_ends_at": now + timedelta(days=3),
            "billing_grace_until": now + timedelta(days=10),
            "maintenance_mode": False,
            "maintenance_starts_at": None,
            "maintenance_ends_at": None,
            "maintenance_reason": None,
            "maintenance_scopes": None,
            "maintenance_access_mode": "write_block",
            "api_read_requests_per_minute": 120,
            "api_write_requests_per_minute": 45,
            "module_limits_json": json.dumps(
                {
                    "core.users": 6,
                    "core.users.active": 4,
                    "finance.entries.monthly": 18,
                },
                sort_keys=True,
            ),
        },
        {
            "name": "Torre en Mantenimiento",
            "slug": "torre-mantenimiento",
            "tenant_type": "condos",
            "plan_code": pick_plan(0),
            "status": "active",
            "status_reason": None,
            "billing_provider": "stripe",
            "billing_provider_customer_id": "cus_demo_mantenimiento",
            "billing_provider_subscription_id": "sub_demo_mantenimiento",
            "billing_status": "active",
            "billing_status_reason": "Suscripcion activa",
            "billing_current_period_ends_at": now + timedelta(days=20),
            "billing_grace_until": None,
            "maintenance_mode": False,
            "maintenance_starts_at": now - timedelta(hours=1),
            "maintenance_ends_at": now + timedelta(hours=5),
            "maintenance_reason": "Ajuste operativo del modulo finance",
            "maintenance_scopes": "finance",
            "maintenance_access_mode": "write_block",
            "api_read_requests_per_minute": 150,
            "api_write_requests_per_minute": 60,
            "module_limits_json": json.dumps(
                {
                    "finance.entries.monthly.expense": 12,
                    "finance.entries.monthly.income": 10,
                },
                sort_keys=True,
            ),
        },
        {
            "name": "Empresa Suspendida",
            "slug": "empresa-suspendida",
            "tenant_type": "empresa",
            "plan_code": pick_plan(0),
            "status": "suspended",
            "status_reason": "Suspension administrativa de soporte",
            "billing_provider": "stripe",
            "billing_provider_customer_id": "cus_demo_suspendida",
            "billing_provider_subscription_id": "sub_demo_suspendida",
            "billing_status": "suspended",
            "billing_status_reason": "Suspension por politica de billing",
            "billing_current_period_ends_at": now - timedelta(days=3),
            "billing_grace_until": None,
            "maintenance_mode": False,
            "maintenance_starts_at": None,
            "maintenance_ends_at": None,
            "maintenance_reason": None,
            "maintenance_scopes": None,
            "maintenance_access_mode": "write_block",
            "api_read_requests_per_minute": 60,
            "api_write_requests_per_minute": 20,
            "module_limits_json": None,
        },
        {
            "name": "Archivo Demo",
            "slug": "archivo-demo",
            "tenant_type": "empresa",
            "plan_code": pick_plan(0),
            "status": "archived",
            "status_reason": "Tenant historico archivado para referencia",
            "billing_provider": "stripe",
            "billing_provider_customer_id": "cus_demo_archivo",
            "billing_provider_subscription_id": "sub_demo_archivo",
            "billing_status": "canceled",
            "billing_status_reason": "Suscripcion cancelada",
            "billing_current_period_ends_at": now - timedelta(days=15),
            "billing_grace_until": None,
            "maintenance_mode": False,
            "maintenance_starts_at": None,
            "maintenance_ends_at": None,
            "maintenance_reason": None,
            "maintenance_scopes": None,
            "maintenance_access_mode": "write_block",
            "api_read_requests_per_minute": None,
            "api_write_requests_per_minute": None,
            "module_limits_json": None,
        },
    ]


DEMO_TENANT_USERS = [
    {
        "full_name": "Tenant Manager",
        "email_template": "manager@{tenant_slug}.local",
        "password": "TenantManager123!",
        "role": "manager",
        "is_active": True,
    },
    {
        "full_name": "Tenant Operator",
        "email_template": "operator@{tenant_slug}.local",
        "password": "TenantOperator123!",
        "role": "operator",
        "is_active": True,
    },
    {
        "full_name": "Backoffice Admin",
        "email_template": "backoffice@{tenant_slug}.local",
        "password": "TenantBackoffice123!",
        "role": "admin",
        "is_active": False,
    },
]


def build_demo_finance_entries() -> list[dict]:
    now = datetime.now(timezone.utc)
    return [
        {
            "movement_type": "income",
            "concept": "Cobro gastos comunes",
            "amount": 4200.0,
            "category": "collections",
            "created_by_user_id": 1,
            "created_at": now - timedelta(days=2),
        },
        {
            "movement_type": "income",
            "concept": "Ingreso extraordinario estacionamientos",
            "amount": 580.0,
            "category": "parking",
            "created_by_user_id": 1,
            "created_at": now - timedelta(days=8),
        },
        {
            "movement_type": "expense",
            "concept": "Contrato de aseo",
            "amount": 830.0,
            "category": "cleaning",
            "created_by_user_id": 1,
            "created_at": now - timedelta(days=4),
        },
        {
            "movement_type": "expense",
            "concept": "Mantencion ascensor",
            "amount": 610.0,
            "category": "maintenance",
            "created_by_user_id": 1,
            "created_at": now - timedelta(days=9),
        },
        {
            "movement_type": "expense",
            "concept": "Servicio de internet oficina",
            "amount": 72.5,
            "category": "services",
            "created_by_user_id": 1,
            "created_at": now - timedelta(days=12),
        },
    ]
