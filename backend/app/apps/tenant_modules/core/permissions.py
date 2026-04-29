TENANT_ROLE_PERMISSIONS: dict[str, set[str]] = {
    "admin": {
        "tenant.users.read",
        "tenant.users.create",
        "tenant.users.update",
        "tenant.users.change_status",
        "tenant.users.delete",
        "tenant.finance.read",
        "tenant.finance.create",
        "tenant.finance.manage",
        "tenant.business_core.read",
        "tenant.business_core.manage",
        "tenant.products.read",
        "tenant.products.manage",
        "tenant.chat.read",
        "tenant.chat.manage",
        "tenant.crm.read",
        "tenant.crm.manage",
        "tenant.maintenance.read",
        "tenant.maintenance.manage",
        "tenant.taskops.read",
        "tenant.taskops.create_own",
        "tenant.taskops.assign_others",
        "tenant.taskops.manage",
        "tenant.techdocs.read",
        "tenant.techdocs.manage",
    },
    "manager": {
        "tenant.users.read",
        "tenant.finance.read",
        "tenant.finance.create",
        "tenant.finance.manage",
        "tenant.business_core.read",
        "tenant.business_core.manage",
        "tenant.products.read",
        "tenant.products.manage",
        "tenant.chat.read",
        "tenant.chat.manage",
        "tenant.crm.read",
        "tenant.crm.manage",
        "tenant.maintenance.read",
        "tenant.maintenance.manage",
        "tenant.taskops.read",
        "tenant.taskops.create_own",
        "tenant.taskops.assign_others",
        "tenant.taskops.manage",
        "tenant.techdocs.read",
        "tenant.techdocs.manage",
    },
    "operator": {
        "tenant.finance.read",
        "tenant.business_core.read",
        "tenant.products.read",
        "tenant.chat.read",
        "tenant.crm.read",
        "tenant.maintenance.read",
        "tenant.taskops.read",
        "tenant.taskops.create_own",
        "tenant.techdocs.read",
    },
}


ALL_TENANT_PERMISSIONS: tuple[str, ...] = tuple(
    sorted({permission for values in TENANT_ROLE_PERMISSIONS.values() for permission in values})
)


def get_permissions_for_role(role: str) -> set[str]:
    return set(TENANT_ROLE_PERMISSIONS.get((role or "").strip().lower(), set()))


def normalize_permission_codes(values: list[str] | tuple[str, ...] | set[str] | None) -> list[str]:
    normalized: list[str] = []
    seen: set[str] = set()
    for raw_value in values or []:
        value = str(raw_value or "").strip().lower()
        if not value or value not in ALL_TENANT_PERMISSIONS or value in seen:
            continue
        seen.add(value)
        normalized.append(value)
    return sorted(normalized)


def resolve_effective_permissions(
    role: str,
    *,
    granted_permissions: list[str] | tuple[str, ...] | set[str] | None = None,
    revoked_permissions: list[str] | tuple[str, ...] | set[str] | None = None,
) -> set[str]:
    resolved = get_permissions_for_role(role)
    resolved.update(normalize_permission_codes(granted_permissions))
    resolved.difference_update(normalize_permission_codes(revoked_permissions))
    return resolved
