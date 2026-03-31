import { expect, test, type Page } from "@playwright/test";
import { loginPlatform } from "../support/auth";

async function selectTenant(page: Page, tenantSlug: string) {
  await page.goto("/tenants");
  await expect(page).toHaveURL(/\/tenants$/);
  await expect(
    page.getByRole("heading", { name: "Tenants", exact: true })
  ).toBeVisible();

  await page.locator("input.form-control").first().fill(tenantSlug);

  const tenantListItem = page
    .locator("button.tenant-list__item")
    .filter({ hasText: tenantSlug })
    .first();

  await expect(tenantListItem).toBeVisible();
  await tenantListItem.click();
}

async function ensureTenantPortalReady(page: Page, tenantSlug: string) {
  const openTenantPortalLink = page.getByRole("link", {
    name: /Abrir portal tenant|Open tenant portal/i,
  });

  if ((await openTenantPortalLink.count()) === 0) {
    try {
      await expect
        .poll(
          async () => {
            await selectTenant(page, tenantSlug);
            return openTenantPortalLink.count();
          },
          { timeout: 5000 }
        )
        .toBeGreaterThan(0);
    } catch {
      const runNowButton = page.getByRole("button", {
        name: /Ejecutar ahora|Run now/i,
      });

      if ((await runNowButton.count()) > 0) {
        await runNowButton.click();

        const confirmDialog = page.getByRole("dialog");
        await expect(confirmDialog).toBeVisible();
        await confirmDialog
          .getByRole("button", { name: /Ejecutar ahora|Run now/i })
          .click();

        await expect(
          page
            .locator(".tenant-action-feedback--success")
            .filter({ hasText: /Ejecución de provisioning|Run provisioning/i })
            .first()
        ).toContainText(/ejecutado correctamente|started successfully/i);
      }

      await expect
        .poll(
          async () => {
            await selectTenant(page, tenantSlug);
            return openTenantPortalLink.count();
          },
          { timeout: 20000 }
        )
        .toBeGreaterThan(0);
    }
  }

  await expect(openTenantPortalLink).toBeVisible();
}

async function loginTenantBootstrap(page: Page, tenantSlug: string) {
  const searchParams = new URLSearchParams({
    tenantSlug,
    email: `admin@${tenantSlug}.local`,
  });

  await page.goto(`/tenant-portal/login?${searchParams.toString()}`);
  await expect(
    page.getByRole("heading", { name: /Portal Tenant|Tenant Portal/i })
  ).toBeVisible();
  await expect(page.locator('input[autocomplete="organization"]')).toHaveValue(tenantSlug);
  await expect(page.locator('input[autocomplete="email"]')).toHaveValue(
    `admin@${tenantSlug}.local`
  );
  await page
    .locator('input[autocomplete="current-password"]')
    .fill("TenantAdmin123!");
  await page.getByRole("button", { name: /Ingresar|Login/i }).click();

  await expect(page).toHaveURL(/\/tenant-portal($|[#?])/);
  await expect(
    page.getByRole("heading", {
      name: /Módulos habilitados|Enabled modules/i,
      exact: true,
    })
  ).toBeVisible();
}

test("tenant portal shows active-user limit enforcement after tenant override", async ({
  page,
}) => {
  const uniqueSuffix = Date.now();
  const tenantName = `E2E Tenant Limit ${uniqueSuffix}`;
  const tenantSlug = `e2e-tenant-limit-${uniqueSuffix}`;
  const blockedUserEmail = `operator-${uniqueSuffix}@${tenantSlug}.local`;

  await loginPlatform(page);
  await page.goto("/tenants");
  await expect(page).toHaveURL(/\/tenants$/);

  const createForm = page.locator("form.tenant-create-form").first();
  await createForm
    .getByPlaceholder(/Ej: Empresa Centro|Ex: Empresa Centro/i)
    .fill(tenantName);
  await createForm.getByPlaceholder("empresa-centro").fill(tenantSlug);
  await createForm
    .getByRole("button", { name: /Crear tenant|Create tenant/i })
    .click();

  await expect(
    page
      .locator(".tenant-action-feedback--success")
      .filter({ hasText: /Alta de tenant|Create tenant/i })
      .first()
  ).toContainText(/creado|created/i);

  await selectTenant(page, tenantSlug);
  await ensureTenantPortalReady(page, tenantSlug);

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
  await activeUsersLimitRow.locator('input[type="number"]').fill("1");
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

  await loginTenantBootstrap(page, tenantSlug);

  const usageRow = page
    .locator("tbody tr")
    .filter({ hasText: "core.users.active" })
    .first();
  await expect(usageRow).toBeVisible();
  await expect(usageRow).toContainText(/al límite|at limit/i);

  await page.goto("/tenant-portal/users");
  await expect(page).toHaveURL(/\/tenant-portal\/users$/);
  await expect(
    page.getByRole("heading", { name: /Usuarios|Users/i })
  ).toBeVisible();

  const createUserForm = page.locator("form").first();
  await createUserForm.getByLabel(/Nombre completo|Full name/i).fill("Operador E2E");
  await createUserForm.getByLabel("Email").fill(blockedUserEmail);
  await createUserForm.getByLabel(/Contraseña|Password/i).fill("TenantUser123!");
  await createUserForm.getByLabel(/Rol|Role/i).selectOption("operator");
  await createUserForm.getByRole("button", { name: /Crear usuario|Create user/i }).click();

  await expect(
    page.locator(".tenant-action-feedback--error").first()
  ).toContainText(/límite de usuarios activos|active user limit/i);
  await expect(page.getByText(blockedUserEmail, { exact: true })).toHaveCount(0);
});