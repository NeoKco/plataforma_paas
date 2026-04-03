TENANT_ROLE_PERMISSIONS: dict[str, set[str]] = {
    "admin": {
        "tenant.users.read",
        "tenant.users.create",
        "tenant.users.update",
        "tenant.users.change_status",
        "tenant.users.delete",
        "tenant.finance.read",
        "tenant.finance.create",
        "tenant.business_core.read",
        "tenant.business_core.manage",
        "tenant.maintenance.read",
        "tenant.maintenance.manage",
    },
    "manager": {
        "tenant.users.read",
        "tenant.finance.read",
        "tenant.finance.create",
        "tenant.business_core.read",
        "tenant.business_core.manage",
        "tenant.maintenance.read",
        "tenant.maintenance.manage",
    },
    "operator": {
        "tenant.finance.read",
        "tenant.business_core.read",
        "tenant.maintenance.read",
    },
}


def get_permissions_for_role(role: str) -> set[str]:
    return TENANT_ROLE_PERMISSIONS.get(role, set())
