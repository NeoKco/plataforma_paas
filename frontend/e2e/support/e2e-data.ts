const runSeed =
  process.env.E2E_RUN_ID?.trim() || `${Date.now()}-${process.pid}-${Math.random().toString(36).slice(2, 8)}`;

let sequence = 0;

function normalizeSegment(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export function nextE2EId(scope: string) {
  sequence += 1;
  const normalizedScope = normalizeSegment(scope) || "run";
  const normalizedRunSeed = normalizeSegment(runSeed) || "seed";
  return `${normalizedScope}-${normalizedRunSeed}-${sequence}`;
}

export function buildE2ETenantIdentity(scope: string) {
  const id = nextE2EId(scope);
  const label = scope
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");

  return {
    id,
    slug: `e2e-${id}`,
    name: `E2E ${label || "Tenant"} ${id}`,
  };
}

export function buildE2EPlatformUserIdentity(role: "admin" | "support") {
  const id = nextE2EId(`platform-${role}`);
  const roleLabel = role === "admin" ? "Admin" : "Support";

  return {
    id,
    fullName: `E2E Platform ${roleLabel} ${id}`,
    email: `e2e-platform-${role}-${id}@platform.local`,
    password: `${roleLabel}Role${id.replace(/-/g, "")}!`,
  };
}

export function buildE2ETwitterUserEmail(prefix: string, tenantSlug: string) {
  const id = nextE2EId(prefix);
  return `${normalizeSegment(prefix)}-${id}@${tenantSlug}.local`;
}

export function buildE2EText(scope: string, prefix = "e2e") {
  return `${prefix}-${nextE2EId(scope)}`;
}
