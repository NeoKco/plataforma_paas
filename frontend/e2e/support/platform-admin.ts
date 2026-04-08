import { expect, type Locator, type Page } from "@playwright/test";

export async function openCreateTenantForm(page: Page): Promise<Locator> {
  await page.getByRole("button", { name: /Nuevo tenant|New tenant/i }).click();
  const dialog = page.getByRole("dialog", { name: /Crear tenant|Create tenant/i });
  await expect(dialog).toBeVisible();
  const form = dialog.locator("form.tenant-create-form").first();
  await expect(form).toBeVisible();
  return form;
}

export async function fillCreateTenantForm(
  form: Locator,
  tenant: {
    name: string;
    slug: string;
    adminFullName: string;
    adminEmail: string;
    adminPassword: string;
  }
): Promise<void> {
  await form
    .getByPlaceholder(/Ej: Empresa Centro|Ex: Empresa Centro/i)
    .fill(tenant.name);
  await form.getByPlaceholder("empresa-centro").fill(tenant.slug);
  await form
    .getByPlaceholder(/Ej: Ana Pérez|Ex: Ana Perez/i)
    .fill(tenant.adminFullName);
  await form.getByPlaceholder("admin@empresa-centro.local").fill(tenant.adminEmail);
  await form
    .locator('input[type="password"]')
    .nth(0)
    .fill(tenant.adminPassword);
  await form
    .locator('input[type="password"]')
    .nth(1)
    .fill(tenant.adminPassword);
}

export async function openCreatePlatformUserForm(page: Page): Promise<Locator> {
  await page.getByRole("button", { name: /Nuevo usuario|New user/i }).click();
  const dialog = page.getByRole("dialog", {
    name: /Crear usuario de plataforma|Create platform user/i,
  });
  await expect(dialog).toBeVisible();
  const form = dialog.locator("form").first();
  await expect(form).toBeVisible();
  return form;
}
