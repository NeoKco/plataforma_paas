import { expect, type Page } from "@playwright/test";
import { e2eEnv } from "./env";

export async function loginPlatform(page: Page) {
  await page.goto("/login");
  await expect(
    page.getByRole("heading", {
      name: /Administración de Plataforma|Platform Admin/,
    })
  ).toBeVisible();

  await page
    .locator('input[autocomplete="email"]')
    .fill(e2eEnv.platform.email);
  await page
    .locator('input[autocomplete="current-password"]')
    .fill(e2eEnv.platform.password);
  await page.getByRole("button", { name: /Ingresar|Login/ }).click();

  await expect(page).toHaveURL(/\/($|[#?])/);
  await expect(
    page.getByRole("heading", {
      name: /Resumen operativo|Operational overview/,
    })
  ).toBeVisible();
}

export async function loginTenant(page: Page) {
  if (!e2eEnv.tenant.slug || !e2eEnv.tenant.email || !e2eEnv.tenant.password) {
    throw new Error(
      "Tenant E2E credentials are not configured. Set E2E_TENANT_SLUG, E2E_TENANT_EMAIL and E2E_TENANT_PASSWORD before running the tenant browser smoke."
    );
  }

  const searchParams = new URLSearchParams({
    tenantSlug: e2eEnv.tenant.slug,
    email: e2eEnv.tenant.email,
  });

  await page.goto(`/tenant-portal/login?${searchParams.toString()}`);
  await expect(
    page.getByRole("heading", {
      name: /Portal Tenant|Tenant Portal/,
    })
  ).toBeVisible();

  const tenantSlugInput = page.locator('input[autocomplete="organization"]');
  const tenantEmailInput = page.locator('input[autocomplete="email"]');
  const tenantPasswordInput = page.locator('input[autocomplete="current-password"]');

  await expect(tenantSlugInput).toHaveValue(e2eEnv.tenant.slug);
  await expect(tenantEmailInput).toHaveValue(e2eEnv.tenant.email);
  await tenantPasswordInput.fill(e2eEnv.tenant.password);
  await page.getByRole("button", { name: /Ingresar|Login/ }).click();

  await page.waitForLoadState("networkidle");

  if (/\/tenant-portal\/login/.test(page.url())) {
    const visibleAlert = page.locator(".alert.alert-danger").first();
    const alertText = (await visibleAlert.isVisible().catch(() => false))
      ? await visibleAlert.textContent()
      : null;
    throw new Error(
      `Tenant login did not advance for slug=${e2eEnv.tenant.slug} email=${e2eEnv.tenant.email}${
        alertText ? ` :: ${alertText.trim()}` : ""
      }`
    );
  }

  await expect(page).toHaveURL(/\/tenant-portal($|[#?])/);
  await expect(
    page.getByRole("heading", {
      name: /Módulos habilitados|Enabled modules/,
    })
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Finanzas|Finance/ })
  ).toBeVisible();
}
