function readEnv(name: string, fallback: string) {
  const value = process.env[name]?.trim();
  return value || fallback;
}

function readOptionalEnv(name: string) {
  return process.env[name]?.trim() || "";
}

export const e2eEnv = {
  platform: {
    email: readEnv("E2E_PLATFORM_EMAIL", "admin@platform.local"),
    password: readEnv("E2E_PLATFORM_PASSWORD", "AdminTemporal123!"),
  },
  tenant: {
    slug: readEnv("E2E_TENANT_SLUG", "empresa-bootstrap"),
    email: readEnv("E2E_TENANT_EMAIL", "admin@empresa-bootstrap.local"),
    password: readEnv("E2E_TENANT_PASSWORD", "TenantAdmin123!"),
  },
} as const;
