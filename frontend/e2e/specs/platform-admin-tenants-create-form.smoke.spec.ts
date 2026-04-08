import { expect, test } from "../support/test";
import { loginPlatform } from "../support/auth";
import { openCreateTenantForm } from "../support/platform-admin";

test("platform admin requires explicit initial admin and shows plan modules in new tenant", async ({
  page,
}) => {
  await loginPlatform(page);
  await page.goto("/tenants");
  await expect(page).toHaveURL(/\/tenants$/);

  const form = await openCreateTenantForm(page);
  const submitButton = form.getByRole("button", { name: /Crear tenant|Create tenant/i });

  await expect(submitButton).toBeDisabled();

  await form.getByPlaceholder(/Ej: Empresa Centro|Ex: Empresa Centro/i).fill("E2E Preview Tenant");
  await form.locator('input[placeholder="empresa-centro"]').fill("e2e-preview-tenant");

  await expect(submitButton).toBeDisabled();

  const planSelect = form.locator("select.form-select").nth(1);
  const optionValues = await planSelect.locator("option").evaluateAll((options) =>
    options
      .map((option) => (option as HTMLOptionElement).value)
      .filter((value) => value.trim().length > 0)
  );

  expect(optionValues.length).toBeGreaterThan(0);

  await planSelect.selectOption(optionValues[0]);

  await expect(
    form.getByText(/M[oó]dulos habilitados por el plan seleccionado|Modules enabled by the selected plan/i)
  ).toBeVisible();
  await expect(form.locator(".tenant-chip").first()).toBeVisible();

  await form.getByPlaceholder(/Ej: Ana Pérez|Ex: Ana Perez/i).fill("Ana Preview");
  await form
    .locator('input[placeholder="admin@empresa-centro.local"]')
    .fill("ana.preview@tenant.local");
  await form.locator('input[type="password"]').nth(0).fill("AnaPreview123!");
  await form.locator('input[type="password"]').nth(1).fill("AnaPreview123!");

  await expect(submitButton).toBeEnabled();
});
