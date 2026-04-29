import type { TenantUserData, TenantUsersItem } from "../../../types";

export const TENANT_PERMISSION_CATALOG = [
  "tenant.users.read",
  "tenant.users.create",
  "tenant.users.update",
  "tenant.users.change_status",
  "tenant.users.delete",
  "tenant.finance.read",
  "tenant.finance.create",
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
] as const;

export type TenantPermissionCode = (typeof TENANT_PERMISSION_CATALOG)[number];

const PERMISSION_LABELS: Record<TenantPermissionCode, { es: string; en: string }> = {
  "tenant.users.read": { es: "Ver usuarios", en: "View users" },
  "tenant.users.create": { es: "Crear usuarios", en: "Create users" },
  "tenant.users.update": { es: "Editar usuarios", en: "Edit users" },
  "tenant.users.change_status": { es: "Cambiar estado de usuarios", en: "Change user status" },
  "tenant.users.delete": { es: "Eliminar usuarios", en: "Delete users" },
  "tenant.finance.read": { es: "Ver finanzas", en: "View finance" },
  "tenant.finance.create": { es: "Registrar movimientos finanzas", en: "Create finance entries" },
  "tenant.business_core.read": { es: "Ver core de negocio", en: "View business core" },
  "tenant.business_core.manage": { es: "Gestionar core de negocio", en: "Manage business core" },
  "tenant.products.read": { es: "Ver catálogo", en: "View catalog" },
  "tenant.products.manage": { es: "Gestionar catálogo", en: "Manage catalog" },
  "tenant.chat.read": { es: "Ver chat interno", en: "View internal chat" },
  "tenant.chat.manage": { es: "Gestionar chat interno", en: "Manage internal chat" },
  "tenant.crm.read": { es: "Ver CRM", en: "View CRM" },
  "tenant.crm.manage": { es: "Gestionar CRM", en: "Manage CRM" },
  "tenant.maintenance.read": { es: "Ver mantenciones", en: "View maintenance" },
  "tenant.maintenance.manage": { es: "Gestionar mantenciones", en: "Manage maintenance" },
  "tenant.taskops.read": { es: "Ver tareas", en: "View tasks" },
  "tenant.taskops.create_own": { es: "Crear tareas propias", en: "Create own tasks" },
  "tenant.taskops.assign_others": { es: "Asignar tareas a otros", en: "Assign tasks to others" },
  "tenant.taskops.manage": { es: "Gestionar tareas", en: "Manage tasks" },
  "tenant.techdocs.read": { es: "Ver expediente técnico", en: "View technical dossier" },
  "tenant.techdocs.manage": { es: "Gestionar expediente técnico", en: "Manage technical dossier" },
};

export function getTenantPermissionLabel(
  permission: string,
  language: "es" | "en"
): string {
  const known = PERMISSION_LABELS[permission as TenantPermissionCode];
  if (!known) {
    return permission;
  }
  return known[language];
}

export function getTenantPermissionSet(
  user: TenantUserData | TenantUsersItem | null | undefined
): Set<string> {
  if (!user) {
    return new Set();
  }
  if ("effective_permissions" in user) {
    return new Set(user.effective_permissions ?? []);
  }
  return new Set(user.permissions ?? []);
}

export function hasTenantPermission(
  user: TenantUserData | TenantUsersItem | null | undefined,
  permission: string
): boolean {
  return getTenantPermissionSet(user).has(permission);
}
