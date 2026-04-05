import { expect, test, type Page } from "../support/test";
import { loginTenant } from "../support/auth";
import {
  getTenantUserUsageSnapshot,
  seedTenantUser,
  setTenantModuleLimit,
} from "../support/backend-control";
import { buildE2ETenantUserEmail } from "../support/e2e-data";
import { e2eEnv } from "../support/env";

async function ensureTenantUsersPage(page: Page) {
  await page.goto("/tenant-portal/users");
  await page.waitForLoadState("networkidle");

  if (/\/tenant-portal\/login($|[?#])/.test(page.url())) {
    await loginTenant(page);
    await page.goto("/tenant-portal/users");
    await page.waitForLoadState("networkidle");
  }

  await expect(page).toHaveURL(/\/tenant-portal\/users($|[?#])/);
  await expect(page.getByRole("heading", { name: /^(Usuarios|Users)$/i })).toBeVisible();
}

async function openTenantUserCreateForm(page: Page) {
  await page.getByRole("button", { name: /Nuevo usuario|New user/i }).click();
  const createDialog = page.getByRole("dialog", {
    name: /Crear usuario del tenant|Create tenant user/i,
  });
  await expect(createDialog).toBeVisible();
  return createDialog.locator("form").first();
}

function getActionFeedback(page: Page, type: "success" | "error") {
  return page.locator(`.tenant-action-feedback--${type}`).first();
}

test("tenant portal blocks user creation when monthly user quota is exhausted", async ({ page }) => {
  const seedEmail = `monthly-seed@${e2eEnv.tenant.slug}.local`;
  const blockedEmail = buildE2ETenantUserEmail("monthly-blocked", e2eEnv.tenant.slug);

  const seededUser = seedTenantUser({
    tenantSlug: e2eEnv.tenant.slug,
    fullName: "Monthly quota seed E2E",
    email: seedEmail,
    password: "TenantUser123!",
    role: "operator",
    isActive: false,
    createdAtIso: new Date().toISOString(),
  });
  expect(seededUser.email).toBe(seedEmail);

  const usageSnapshot = getTenantUserUsageSnapshot(e2eEnv.tenant.slug);
  expect(usageSnapshot.monthlyUsers).toBeGreaterThan(0);

  const appliedLimit = setTenantModuleLimit({
    tenantSlug: e2eEnv.tenant.slug,
    moduleKey: "core.users.monthly",
    value: usageSnapshot.monthlyUsers,
  });
  expect(appliedLimit.moduleLimits["core.users.monthly"]).toBe(usageSnapshot.monthlyUsers);

  try {
    await ensureTenantUsersPage(page);

    const createUserForm = await openTenantUserCreateForm(page);
    await createUserForm
      .getByPlaceholder(/Ej: María Pérez|Example: Maria Perez/i)
      .fill("Monthly blocked E2E");
    await createUserForm
      .getByPlaceholder(/Ej: maria@empresa-demo.local|Example: maria@empresa-demo.local/i)
      .fill(blockedEmail);
    await createUserForm
      .getByPlaceholder(/Define una contraseña inicial|Define an initial password/i)
      .fill("TenantUser123!");
    await createUserForm.getByRole("combobox").nth(0).selectOption("operator");
    await createUserForm.getByRole("button", { name: /Crear usuario|Create user/i }).click();

    await expect(getActionFeedback(page, "error")).toContainText(
      /límite mensual de creación de usuarios|monthly user creation limit/i
    );
    await expect(page.getByText(blockedEmail, { exact: true })).toHaveCount(0);
  } finally {
    const clearedLimit = setTenantModuleLimit({
      tenantSlug: e2eEnv.tenant.slug,
      moduleKey: "core.users.monthly",
      value: null,
    });
    expect(clearedLimit.moduleLimits["core.users.monthly"]).toBeUndefined();
  }
});
