import { expect, test, type Page } from "@playwright/test";
import { loginPlatform, loginTenant } from "../support/auth";
import { e2eEnv } from "../support/env";

async function ensurePlatformTenantsPage(page: Page) {
  await page.goto("/tenants");
  if (/\/login($|[?#])/.test(page.url())) {
    await loginPlatform(page);
    await page.goto("/tenants");
  }

  await expect(page).toHaveURL(/\/tenants$/);
  await expect(
    page.getByRole("heading", { name: "Tenants", exact: true })
  ).toBeVisible();
}

async function selectTenant(page: Page, tenantSlug: string) {
  await ensurePlatformTenantsPage(page);
  await page.locator("input.form-control").first().fill(tenantSlug);

  const tenantListItem = page
    .locator("button.tenant-list__item")
    .filter({ hasText: tenantSlug })
    .first();

  await expect(tenantListItem).toBeVisible();
  await tenantListItem.click();
}

async function updateActiveUsersLimit(page: Page, tenantSlug: string, value: string) {
  await selectTenant(page, tenantSlug);

  const moduleLimitsForm = page
    .locator("form.tenant-action-form")
    .filter({
      has: page.getByRole("heading", { name: /Límites por módulo|Module limits/i }),
    })
    .first();

  const activeUsersLimitRow = moduleLimitsForm
    .locator(".tenant-module-limit-row")
    .filter({ hasText: "core.users.active" })
    .first();

  await expect(activeUsersLimitRow).toBeVisible();
  await activeUsersLimitRow.locator('input[type="number"]').fill(value);
  await moduleLimitsForm
    .getByRole("button", { name: /Actualizar límites por módulo|Update module limits/i })
    .click();

  const confirmDialog = page.getByRole("dialog");
  await expect(confirmDialog).toBeVisible();
  await confirmDialog
    .getByRole("button", {
      name: /Actualizar límites por módulo|Update module limits/i,
    })
    .click();

  await expect(
    page
      .locator(".tenant-action-feedback--success")
      .filter({ hasText: /Límites por módulo|Module limits/i })
      .first()
  ).toContainText(/actualizados|updated/i);
}

test("tenant portal shows active-user limit enforcement after tenant override", async ({
  page,
}) => {
  const blockedUserEmail = `operator-${Date.now()}@${e2eEnv.tenant.slug}.local`;

  await loginPlatform(page);
  await updateActiveUsersLimit(page, e2eEnv.tenant.slug, "1");

  try {
    await loginTenant(page);

    const usageRow = page
      .locator("tbody tr")
      .filter({ hasText: "core.users.active" })
      .first();
    await expect(usageRow).toBeVisible();
    await expect(usageRow).toContainText(/al límite|at limit/i);

    await page.goto("/tenant-portal/users");
    await expect(page).toHaveURL(/\/tenant-portal\/users$/);
    await expect(
      page.getByRole("heading", { name: /Usuarios|Users/i, exact: true })
    ).toBeVisible();

    const createUserForm = page.locator("form").first();
    await createUserForm
      .getByPlaceholder(/Ej: María Pérez|Example: Maria Perez/i)
      .fill("Operador E2E");
    await createUserForm
      .getByPlaceholder(/Ej: maria@empresa-demo.local|Example: maria@empresa-demo.local/i)
      .fill(blockedUserEmail);
    await createUserForm
      .getByPlaceholder(/Define una contraseña inicial|Define an initial password/i)
      .fill("TenantUser123!");
    await createUserForm.getByRole("combobox").nth(0).selectOption("operator");
    await createUserForm
      .getByRole("button", { name: /Crear usuario|Create user/i })
      .click();

    await expect(page.locator(".tenant-action-feedback--error").first()).toContainText(
      /límite de usuarios activos|active user limit/i
    );
    await expect(page.getByText(blockedUserEmail, { exact: true })).toHaveCount(0);
  } finally {
    await updateActiveUsersLimit(page, e2eEnv.tenant.slug, "");
  }
});