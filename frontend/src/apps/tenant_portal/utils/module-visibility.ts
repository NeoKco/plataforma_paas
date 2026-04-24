import type { TenantInfoData } from "../../../types";

export type TenantPortalModuleSection =
  | "overview"
  | "users"
  | "business-core"
  | "chat"
  | "crm"
  | "taskops"
  | "techdocs"
  | "finance"
  | "agenda"
  | "maintenance";

const SECTION_MODULE_KEYS: Record<
  TenantPortalModuleSection,
  Array<
    "all" | "core" | "users" | "finance" | "maintenance" | "crm" | "taskops" | "techdocs" | "chat"
  >
> = {
  overview: ["all", "core", "users", "finance"],
  users: ["all", "users"],
  "business-core": ["all", "core"],
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

  return SECTION_MODULE_KEYS[section].some((value) => normalizedModules.has(value));
}
