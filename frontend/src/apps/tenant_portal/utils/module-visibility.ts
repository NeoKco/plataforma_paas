import type { TenantInfoData, TenantUserData } from "../../../types";
import { hasTenantPermission } from "./tenant-permissions";

export type TenantPortalModuleSection =
  | "overview"
  | "users"
  | "business-core"
  | "products"
  | "chat"
  | "crm"
  | "taskops"
  | "techdocs"
  | "finance"
  | "agenda"
  | "maintenance";

const SECTION_READ_PERMISSIONS: Partial<Record<TenantPortalModuleSection, string>> = {
  users: "tenant.users.read",
  "business-core": "tenant.business_core.read",
  products: "tenant.products.read",
  chat: "tenant.chat.read",
  crm: "tenant.crm.read",
  taskops: "tenant.taskops.read",
  techdocs: "tenant.techdocs.read",
  finance: "tenant.finance.read",
  agenda: "tenant.maintenance.read",
  maintenance: "tenant.maintenance.read",
};

const SECTION_MODULE_KEYS: Record<
  TenantPortalModuleSection,
  Array<
    "all" | "core" | "users" | "finance" | "maintenance" | "products" | "crm" | "taskops" | "techdocs" | "chat"
  >
> = {
  overview: ["all", "core", "users", "finance"],
  users: ["all", "users"],
  "business-core": ["all", "core"],
  products: ["all", "products"],
  chat: ["all", "chat"],
  crm: ["all", "crm"],
  taskops: ["all", "taskops"],
  techdocs: ["all", "techdocs"],
  finance: ["all", "finance"],
  agenda: ["all", "maintenance"],
  "maintenance": ["all", "maintenance"],
};

export function isTenantPortalSectionVisible(
  tenantInfo: TenantInfoData | null,
  tenantUser: TenantUserData | null,
  section: TenantPortalModuleSection
) {
  if (section === "overview") {
    return true;
  }

  const enabledModules = tenantInfo?.effective_enabled_modules;
  if (!enabledModules || enabledModules.length === 0) {
    return false;
  }

  const normalizedModules = new Set(
    enabledModules.map((value) => value.trim().toLowerCase()).filter(Boolean)
  );

  const moduleVisible = SECTION_MODULE_KEYS[section].some((value) => normalizedModules.has(value));
  if (!moduleVisible) {
    return false;
  }
  const requiredPermission = SECTION_READ_PERMISSIONS[section];
  if (!requiredPermission) {
    return true;
  }
  return hasTenantPermission(tenantUser, requiredPermission);
}
