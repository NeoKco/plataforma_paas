from app.common.policies.module_limit_catalog import list_module_limit_capabilities


def _entry(es: str, en: str) -> dict[str, str]:
    return {"es": es, "en": en}


MODULE_LABELS: dict[str, dict[str, str]] = {
    "all": _entry("Todos los módulos", "All modules"),
    "core": _entry("Core negocio", "Business core"),
    "users": _entry("Usuarios", "Users"),
    "finance": _entry("Finanzas", "Finance"),
    "maintenance": _entry("Mantenciones", "Maintenance"),
    "crm": _entry("CRM comercial", "Commercial CRM"),
    "taskops": _entry("TaskOps", "TaskOps"),
    "techdocs": _entry("Expediente técnico", "Technical dossier"),
}

TENANT_TYPE_LABELS: dict[str, dict[str, str]] = {
    "empresa": _entry("Empresa", "Company"),
    "condominio": _entry("Condominio", "Condominium"),
    "condos": _entry("Condominios", "Condos"),
    "retail": _entry("Retail", "Retail"),
    "enterprise": _entry("Enterprise", "Enterprise"),
    "iot": _entry("IoT", "IoT"),
}

TENANT_STATUS_LABELS: dict[str, dict[str, str]] = {
    "pending": _entry("Pendiente", "Pending"),
    "active": _entry("Activo", "Active"),
    "suspended": _entry("Suspendido", "Suspended"),
    "error": _entry("Con error", "With error"),
    "archived": _entry("Archivado", "Archived"),
}

BILLING_STATUS_LABELS: dict[str, dict[str, str]] = {
    "trialing": _entry("En prueba", "Trialing"),
    "active": _entry("Activa", "Active"),
    "past_due": _entry("Con deuda", "Past due"),
    "suspended": _entry("Suspendida", "Suspended"),
    "canceled": _entry("Cancelada", "Canceled"),
}

MAINTENANCE_ACCESS_MODE_LABELS: dict[str, dict[str, str]] = {
    "write_block": _entry("Bloquear escrituras", "Block writes"),
    "full_block": _entry("Bloquear todo el acceso", "Block all access"),
}

BILLING_CYCLE_LABELS: dict[str, dict[str, str]] = {
    "monthly": _entry("Mensual", "Monthly"),
    "quarterly": _entry("Trimestral", "Quarterly"),
    "semiannual": _entry("Semestral", "Semiannual"),
    "annual": _entry("Anual", "Annual"),
}

SUBSCRIPTION_STATUS_LABELS: dict[str, dict[str, str]] = {
    "draft": _entry("Borrador", "Draft"),
    "pending_activation": _entry("Pendiente de activación", "Pending activation"),
    "active": _entry("Activa", "Active"),
    "scheduled_cancel": _entry("Cancelación programada", "Scheduled cancel"),
    "grace_period": _entry("En gracia", "Grace period"),
    "suspended": _entry("Suspendida", "Suspended"),
    "cancelled": _entry("Cancelada", "Cancelled"),
    "expired": _entry("Expirada", "Expired"),
}

SUBSCRIPTION_ITEM_KIND_LABELS: dict[str, dict[str, str]] = {
    "base_plan": _entry("Plan Base", "Base plan"),
    "addon": _entry("Add-on", "Add-on"),
}

TOKEN_SCOPE_LABELS: dict[str, dict[str, str]] = {
    "platform": _entry("Plataforma", "Platform"),
    "tenant": _entry("Portal tenant", "Tenant portal"),
}

SUBJECT_SCOPE_LABELS: dict[str, dict[str, str]] = {
    "platform": _entry("Plataforma", "Platform"),
    "tenant": _entry("Tenant", "Tenant"),
}

AUDIT_OUTCOME_LABELS: dict[str, dict[str, str]] = {
    "success": _entry("Correcto", "Success"),
    "failed": _entry("Fallido", "Failed"),
    "denied": _entry("Denegado", "Denied"),
    "warning": _entry("Con advertencia", "Warning"),
}

LIMIT_SOURCE_LABELS: dict[str, dict[str, str]] = {
    "plan": _entry("Plan legacy", "Legacy plan"),
    "legacy_plan_code": _entry("Compatibilidad legacy", "Legacy compatibility"),
    "subscription_base_plan": _entry("Plan Base", "Base plan"),
    "subscription_contract": _entry("Contrato tenant", "Tenant contract"),
    "subscription_addon": _entry("Add-on arrendado", "Rented add-on"),
    "billing_grace": _entry("Gracia billing", "Billing grace"),
    "tenant_override": _entry("Ajuste tenant", "Tenant override"),
    "technical_dependency": _entry("Dependencia técnica", "Technical dependency"),
}

ACTIVATION_SOURCE_LABELS: dict[str, dict[str, str]] = {
    "subscriptions": _entry("Suscripción tenant", "Tenant subscription"),
    "subscriptions_with_legacy_fallback": _entry(
        "Suscripción tenant + compatibilidad",
        "Tenant subscription + compatibility",
    ),
    "legacy_plan_only": _entry("Plan legacy", "Legacy plan"),
}

BASELINE_POLICY_SOURCE_LABELS: dict[str, dict[str, str]] = {
    "subscription_base_plan": _entry(
        "Plan Base por suscripción",
        "Subscription base plan",
    ),
    "legacy_plan_code": _entry(
        "Compatibilidad legacy por plan_code",
        "Legacy plan_code compatibility",
    ),
    "subscription_contract": _entry("Contrato tenant", "Tenant contract"),
}

POLICY_EVENT_LABELS: dict[str, dict[str, str]] = {
    "platform.tenant.create": _entry("Alta tenant", "Tenant created"),
    "platform.tenant.reprovision": _entry(
        "Reprovisionamiento tenant",
        "Tenant reprovisioned",
    ),
    "platform.tenant.deprovision_requested": _entry(
        "Desprovisionamiento solicitado",
        "Deprovision requested",
    ),
    "platform.tenant.restore": _entry("Tenant restaurado", "Tenant restored"),
    "platform.tenant.delete": _entry("Tenant eliminado", "Tenant deleted"),
    "platform.tenant.subscription_contract_updated": _entry(
        "Contrato tenant actualizado",
        "Tenant contract updated",
    ),
    "platform.tenant.subscription_contract_migrated_from_legacy": _entry(
        "Tenant migrado desde baseline legacy",
        "Tenant migrated from legacy baseline",
    ),
    "platform.tenant_db_credentials_rotated": _entry(
        "Credenciales DB rotadas",
        "DB credentials rotated",
    ),
    "platform.tenant_db_runtime_secret_synced": _entry(
        "Secreto runtime sincronizado",
        "Runtime secret synced",
    ),
    "platform.tenant_user.password_reset": _entry(
        "Password tenant reseteada",
        "Tenant password reset",
    ),
    "platform.tenant.data_export.create": _entry(
        "Export portable creado",
        "Portable export created",
    ),
    "platform.tenant.data_import.create": _entry(
        "Import portable creado",
        "Portable import created",
    ),
}

POLICY_CHANGED_FIELD_LABELS: dict[str, dict[str, str]] = {
    "status": _entry("Estado tenant", "Tenant status"),
    "status_reason": _entry("Motivo de estado", "Status reason"),
    "plan_code": _entry("Compatibilidad legacy", "Legacy compatibility"),
    "billing_provider": _entry("Proveedor billing", "Billing provider"),
    "billing_provider_customer_id": _entry("Cliente billing", "Billing customer"),
    "billing_provider_subscription_id": _entry(
        "Suscripción billing",
        "Billing subscription",
    ),
    "billing_status": _entry("Estado billing", "Billing status"),
    "billing_status_reason": _entry("Motivo billing", "Billing reason"),
    "billing_current_period_ends_at": _entry(
        "Fin período billing",
        "Billing period end",
    ),
    "billing_grace_until": _entry("Gracia billing", "Billing grace"),
    "maintenance_mode": _entry("Modo mantenimiento", "Maintenance mode"),
    "maintenance_starts_at": _entry("Inicio mantenimiento", "Maintenance start"),
    "maintenance_ends_at": _entry("Fin mantenimiento", "Maintenance end"),
    "maintenance_reason": _entry("Motivo mantenimiento", "Maintenance reason"),
    "maintenance_scopes": _entry("Alcance mantenimiento", "Maintenance scope"),
    "maintenance_access_mode": _entry("Modo de bloqueo", "Blocking mode"),
    "api_read_requests_per_minute": _entry("Lecturas rpm", "Read rpm"),
    "api_write_requests_per_minute": _entry("Escrituras rpm", "Write rpm"),
    "module_limits_json": _entry("Límites por módulo", "Module limits"),
    "tenant_db_credentials_rotated_at": _entry(
        "Última rotación DB",
        "Last DB rotation",
    ),
}

AUTH_EVENT_LABELS: dict[str, dict[str, str]] = {
    "platform.login": _entry("Login plataforma", "Platform login"),
    "platform.refresh": _entry("Refresh plataforma", "Platform refresh"),
    "platform.logout": _entry("Logout plataforma", "Platform logout"),
    "platform.root_recovery": _entry("Recuperación raíz", "Root recovery"),
    "platform.request.denied": _entry(
        "Request plataforma denegada",
        "Platform request denied",
    ),
    "platform.request.rejected": _entry(
        "Request plataforma rechazada",
        "Platform request rejected",
    ),
    "tenant.login": _entry("Login tenant", "Tenant login"),
    "tenant.refresh": _entry("Refresh tenant", "Tenant refresh"),
    "tenant.logout": _entry("Logout tenant", "Tenant logout"),
    "tenant.request.denied": _entry(
        "Request tenant denegada",
        "Tenant request denied",
    ),
    "tenant.request.rejected": _entry(
        "Request tenant rechazada",
        "Tenant request rejected",
    ),
}


def _humanize_code(value: str | None) -> str | None:
    if value is None:
        return None
    normalized = value.strip()
    if not normalized:
        return None
    normalized = normalized.replace(".", " ").replace("_", " ").replace("-", " ")
    return " ".join(part.capitalize() for part in normalized.split())


def build_module_limit_key_labels() -> dict[str, dict[str, str]]:
    english_map = {
        "core.users": "Total tenant users",
        "core.users.active": "Active tenant users",
        "core.users.monthly": "Users created this month",
        "core.users.admin": "Tenant users with admin role",
        "core.users.manager": "Tenant users with manager role",
        "core.users.operator": "Tenant users with operator role",
        "finance.entries": "Total finance entries",
        "finance.entries.monthly": "Finance entries created this month",
        "finance.entries.monthly.income": "Income entries created this month",
        "finance.entries.monthly.expense": "Expense entries created this month",
    }
    labels: dict[str, dict[str, str]] = {}
    for capability in list_module_limit_capabilities():
        key = capability["key"]
        labels[key] = _entry(
            capability["description"] or _humanize_code(key) or key,
            english_map.get(key, _humanize_code(key) or key),
        )
    return labels


def build_platform_ui_label_catalog() -> dict[str, dict[str, dict[str, str]]]:
    return {
        "modules": MODULE_LABELS,
        "tenant_types": TENANT_TYPE_LABELS,
        "tenant_statuses": TENANT_STATUS_LABELS,
        "tenant_billing_statuses": BILLING_STATUS_LABELS,
        "maintenance_scopes": {key: MODULE_LABELS[key] for key in MODULE_LABELS},
        "maintenance_access_modes": MAINTENANCE_ACCESS_MODE_LABELS,
        "billing_cycles": BILLING_CYCLE_LABELS,
        "subscription_statuses": SUBSCRIPTION_STATUS_LABELS,
        "subscription_item_kinds": SUBSCRIPTION_ITEM_KIND_LABELS,
        "token_scopes": TOKEN_SCOPE_LABELS,
        "subject_scopes": SUBJECT_SCOPE_LABELS,
        "audit_outcomes": AUDIT_OUTCOME_LABELS,
        "activation_sources": ACTIVATION_SOURCE_LABELS,
        "baseline_policy_sources": BASELINE_POLICY_SOURCE_LABELS,
        "limit_sources": LIMIT_SOURCE_LABELS,
        "policy_event_types": POLICY_EVENT_LABELS,
        "policy_changed_fields": POLICY_CHANGED_FIELD_LABELS,
        "auth_event_types": AUTH_EVENT_LABELS,
        "module_limit_keys": build_module_limit_key_labels(),
    }


def build_tenant_ui_label_catalog() -> dict[str, dict[str, dict[str, str]]]:
    catalog = build_platform_ui_label_catalog()
    return {
        "modules": catalog["modules"],
        "tenant_types": catalog["tenant_types"],
        "tenant_statuses": catalog["tenant_statuses"],
        "tenant_billing_statuses": catalog["tenant_billing_statuses"],
        "maintenance_scopes": catalog["maintenance_scopes"],
        "maintenance_access_modes": catalog["maintenance_access_modes"],
        "billing_cycles": catalog["billing_cycles"],
        "token_scopes": catalog["token_scopes"],
        "activation_sources": catalog["activation_sources"],
        "baseline_policy_sources": catalog["baseline_policy_sources"],
        "limit_sources": catalog["limit_sources"],
        "module_limit_keys": catalog["module_limit_keys"],
    }
