import { expect, test } from "../support/test";
import { loginPlatform } from "../support/auth";
import { buildE2ETenantIdentity } from "../support/e2e-data";
import { openCreateTenantForm } from "../support/platform-admin";

test("platform admin can run a pending provisioning job from provisioning", async ({
  page,
}) => {
  const tenant = buildE2ETenantIdentity("provisioning-run");

  await loginPlatform(page);
  await page.goto("/tenants");
  await expect(page).toHaveURL(/\/tenants$/);

  const createForm = await openCreateTenantForm(page);
  await createForm
    .getByPlaceholder(/Ej: Empresa Centro|Ex: Empresa Centro/i)
    .fill(tenant.name);
  await createForm.getByPlaceholder("empresa-centro").fill(tenant.slug);
  await createForm
    .getByRole("button", { name: /Crear tenant|Create tenant/ })
    .click();

  await expect(
    page
      .locator(".tenant-action-feedback--success")
      .filter({ hasText: /Alta de tenant|Create tenant/i })
      .first()
  ).toContainText(/creado|created/i);

  await page.goto("/provisioning");
  await expect(page).toHaveURL(/\/provisioning$/);
  await expect(
    page.getByRole("heading", { name: "Provisioning", exact: true })
  ).toBeVisible();

  await page.getByRole("button", { name: /Altas|Creates/i }).click();

  const tenantActionRow = page
    .locator("table tbody tr")
    .filter({ has: page.getByText(tenant.slug, { exact: true }) })
    .first();

  await expect
    .poll(async () => {
      return tenantActionRow.count();
    })
    .toBeGreaterThan(0);

  await tenantActionRow
    .getByRole("button", { name: /Ejecutar ahora|Run now/i })
    .click();

  const confirmDialog = page.getByRole("dialog");
  await expect(confirmDialog).toBeVisible();
  await expect(
    confirmDialog.getByRole("heading", {
      name: /Ejecutar ahora el job #\d+|Run job #\d+ now/i,
    })
  ).toBeVisible();

  await confirmDialog
    .getByRole("button", { name: /Ejecutar ahora|Run now/i })
    .click();

  await expect(
    page
      .locator(".tenant-action-feedback--success")
      .filter({ hasText: /Ejecución de provisioning|Run provisioning/i })
      .first()
  ).toContainText(/ejecutado correctamente|started successfully/i);

  await expect(
    page
      .locator("table tbody tr")
      .filter({ has: page.getByText(tenant.slug, { exact: true }) })
      .getByRole("button", { name: /Ejecutar ahora|Run now/i })
  ).toHaveCount(0);
});