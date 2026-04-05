import { expect, test } from "@playwright/test";
import { loginPlatform } from "../support/auth";
import { openCreateTenantForm } from "../support/platform-admin";

test("platform admin can see a newly created tenant in provisioning", async ({
  page,
}) => {
  const uniqueSuffix = Date.now();
  const tenantName = `E2E Provisioning ${uniqueSuffix}`;
  const tenantSlug = `e2e-provisioning-${uniqueSuffix}`;

  await loginPlatform(page);
  await page.goto("/tenants");
  await expect(page).toHaveURL(/\/tenants$/);

  const createForm = await openCreateTenantForm(page);
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

  await page.goto("/provisioning");
  await expect(page).toHaveURL(/\/provisioning$/);
  await expect(
    page.getByRole("heading", { name: "Provisioning", exact: true })
  ).toBeVisible();

  await page.getByRole("button", { name: /Altas|Creates/i }).click();

  await expect
    .poll(async () => {
      return page.getByText(tenantSlug, { exact: true }).count();
    })
    .toBeGreaterThan(0);
});
