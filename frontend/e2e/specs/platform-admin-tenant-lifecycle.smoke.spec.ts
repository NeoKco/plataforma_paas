import { expect, test } from "@playwright/test";
import { loginPlatform } from "../support/auth";
import { openCreateTenantForm } from "../support/platform-admin";

test("platform admin can create archive and restore a tenant", async ({ page }) => {
  const uniqueSuffix = Date.now();
  const tenantName = `E2E Tenant ${uniqueSuffix}`;
  const tenantSlug = `e2e-tenant-${uniqueSuffix}`;

  await loginPlatform(page);
  await page.goto("/tenants");
  await expect(page).toHaveURL(/\/tenants$/);
  await expect(
    page.getByRole("heading", { name: /Tenants|Tenants/ })
  ).toBeVisible();

  const createForm = await openCreateTenantForm(page);
  await createForm.getByPlaceholder(/Ej: Empresa Centro|Ex: Empresa Centro/i).fill(tenantName);
  await createForm.getByPlaceholder("empresa-centro").fill(tenantSlug);
  await createForm
    .getByRole("button", { name: /Crear tenant|Create tenant/ })
    .click();

  await expect(
    page
      .locator(".tenant-action-feedback--success")
      .filter({ hasText: /Alta de tenant|Create tenant/i })
      .first()
  ).toContainText(/creado|created/i);

  await expect(
    page.getByRole("heading", { name: tenantName, exact: true })
  ).toBeVisible();
  await expect(page.getByText(tenantSlug, { exact: true }).first()).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /Provisioning/i })
  ).toBeVisible();

  await page.getByRole("button", { name: /Archivar tenant|Archive tenant/ }).click();

  const archiveDialog = page.getByRole("dialog");
  await expect(archiveDialog).toBeVisible();
  await archiveDialog
    .getByRole("button", { name: /Archivar tenant|Archive tenant/ })
    .click();

  await expect(
    page
      .locator(".tenant-action-feedback--success")
      .filter({ hasText: /Archivo de tenant|Archive tenant/i })
      .first()
  ).toContainText(/archivado|archived/i);
  await expect(
    page.getByRole("heading", { name: /Restauraci[oó]n|Restore/i })
  ).toBeVisible();

  const restoreForm = page
    .locator("form.tenant-action-form")
    .filter({
      has: page.getByRole("heading", { name: /Restauraci[oó]n|Restore/i }),
    })
    .first();
  await restoreForm
    .getByPlaceholder(/Reactivaci[oó]n operativa autorizada|authorized operational reactivation/i)
    .fill("e2e restore reason");
  await restoreForm
    .getByRole("button", { name: /Restaurar tenant|Restore tenant/ })
    .click();

  const restoreDialog = page.getByRole("dialog");
  await expect(restoreDialog).toBeVisible();
  await restoreDialog
    .getByRole("button", { name: /Restaurar tenant|Restore tenant/ })
    .click();

  await expect(
    page
      .locator(".tenant-action-feedback--success")
      .filter({ hasText: /Restauraci[oó]n de tenant|Restore tenant/i })
      .first()
  ).toContainText(/restaurado|restored/i);
  await expect(
    page.getByRole("button", { name: /Archivar tenant|Archive tenant/ })
  ).toBeVisible();
});
