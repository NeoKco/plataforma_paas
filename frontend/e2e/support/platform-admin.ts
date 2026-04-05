import { expect, type Locator, type Page } from "@playwright/test";

export async function openCreateTenantForm(page: Page): Promise<Locator> {
  await page.getByRole("button", { name: /Nuevo tenant|New tenant/i }).click();
  const dialog = page.getByRole("dialog", { name: /Crear tenant|Create tenant/i });
  await expect(dialog).toBeVisible();
  const form = dialog.locator("form.tenant-create-form").first();
  await expect(form).toBeVisible();
  return form;
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
