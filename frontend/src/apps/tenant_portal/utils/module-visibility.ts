import type { TenantInfoData } from "../../../types";

export type TenantPortalModuleSection =
  | "overview"
  | "users"
  | "business-core"
  | "finance"
  | "maintenance";

const SECTION_MODULE_KEYS: Record<
  TenantPortalModuleSection,
  Array<"all" | "core" | "users" | "finance">
> = {
  overview: ["all", "core", "users", "finance"],
  users: ["all", "users"],
  "business-core": ["all", "core"],
  finance: ["all", "finance"],
  "maintenance": ["all", "core"],
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
