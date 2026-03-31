import { expect, test } from "@playwright/test";
import { loginPlatform } from "../support/auth";

test("platform admin sees tenant portal access blocked when tenant is not eligible", async ({
  page,
}) => {
  const uniqueSuffix = Date.now();
  const tenantName = `E2E Tenant Portal Blocked ${uniqueSuffix}`;
  const tenantSlug = `e2e-tenant-portal-blocked-${uniqueSuffix}`;

  await loginPlatform(page);
  await page.goto("/tenants");
  await expect(page).toHaveURL(/\/tenants$/);
  await expect(
    page.getByRole("heading", { name: "Tenants", exact: true })
  ).toBeVisible();

  const createForm = page.locator("form.tenant-create-form").first();
  await createForm
    .getByPlaceholder(/Ej: Empresa Centro|Ex: Empresa Centro/i)
    .fill(tenantName);
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
    page.getByRole("link", {
      name: /Abrir portal tenant|Open tenant portal/i,
    })
  ).toHaveCount(0);

  await expect(
    page.getByText(
      /El portal tenant solo queda disponible cuando el tenant está activo|The tenant portal is only available when the tenant is active/i
    )
  ).toBeVisible();
});