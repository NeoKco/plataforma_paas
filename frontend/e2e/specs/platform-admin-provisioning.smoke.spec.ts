import { expect, test } from "../support/test";
import { loginPlatform } from "../support/auth";
import { buildE2ETenantIdentity } from "../support/e2e-data";
import { openCreateTenantForm } from "../support/platform-admin";

test("platform admin can see a newly created tenant in provisioning", async ({
  page,
}) => {
  const tenant = buildE2ETenantIdentity("provisioning");

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

  await expect
    .poll(async () => {
      return page.getByText(tenant.slug, { exact: true }).count();
    })
    .toBeGreaterThan(0);
});
