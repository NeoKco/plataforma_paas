export type PlatformAdminRole = "superadmin" | "admin" | "support";

export type PlatformNavKey =
  | "dashboard"
  | "users"
  | "activity"
  | "tenants"
  | "tenant-history"
  | "provisioning"
  | "billing"
  | "settings";

export function normalizePlatformAdminRole(role?: string | null): PlatformAdminRole {
  if (role === "superadmin" || role === "admin" || role === "support") {
    return role;
  }
  return "support";
}

export function getPlatformDefaultRoute(role?: string | null): string {
  const normalizedRole = normalizePlatformAdminRole(role);
  if (normalizedRole === "superadmin") {
    return "/";
  }
  if (normalizedRole === "admin") {
    return "/activity";
  }
  return "/users";
}

export function canAccessPlatformNavItem(
  role: PlatformAdminRole,
  navKey: PlatformNavKey
): boolean {
  if (role === "superadmin") {
    return true;
  }
  if (role === "admin") {
    return navKey === "users" || navKey === "activity";
  }
  return navKey === "users";
}

export function canCreatePlatformUserRole(
  actorRole: PlatformAdminRole,
  targetRole: string
): boolean {
  if (actorRole === "superadmin") {
    return targetRole === "admin" || targetRole === "support";
  }
  if (actorRole === "admin") {
    return targetRole === "support";
  }
  return false;
}

export function canManagePlatformUser(
  actorRole: PlatformAdminRole,
  targetUserRole: string | null | undefined
): boolean {
  if (!targetUserRole) {
    return false;
  }
  if (actorRole === "superadmin") {
    return true;
  }
  if (actorRole === "admin") {
    return targetUserRole === "support";
  }
  return false;
}

export function getEditablePlatformUserRoles(
  actorRole: PlatformAdminRole,
  targetUserRole: string | null | undefined
): string[] {
  if (!targetUserRole) {
    return [];
  }
  if (actorRole === "superadmin") {
    return targetUserRole === "superadmin"
      ? ["superadmin", "admin", "support"]
      : ["admin", "support"];
  }
  if (actorRole === "admin" && targetUserRole === "support") {
    return ["support"];
  }
  return [];
}
