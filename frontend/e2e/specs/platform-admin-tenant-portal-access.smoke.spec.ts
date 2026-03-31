import { expect, test } from "@playwright/test";
import { loginPlatform } from "../support/auth";
import { e2eEnv } from "../support/env";

test("platform admin can open tenant portal from tenants with slug prefilled", async ({
  page,
}) => {
  async function selectTenant() {
    await page
      .locator("input.form-control")
      .first()
      .fill(e2eEnv.tenant.slug);

    const tenantListItem = page
      .locator("button.tenant-list__item")
      .filter({ hasText: e2eEnv.tenant.slug })
      .first();

    await expect(tenantListItem).toBeVisible();
    await tenantListItem.click();
  }

  await loginPlatform(page);

  await page.goto("/tenants");
  await expect(page).toHaveURL(/\/tenants$/);
  await expect(
    page.getByRole("heading", { name: "Tenants", exact: true })
  ).toBeVisible();

  await selectTenant();

  const openTenantPortalLink = page.getByRole("link", {
    name: /Abrir portal tenant|Open tenant portal/i,
  });

  if ((await openTenantPortalLink.count()) === 0) {
    const runNowButton = page.getByRole("button", {
      name: /Ejecutar ahora|Run now/i,
    });

    await expect(runNowButton).toBeVisible();
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

    await expect
      .poll(
        async () => {
          await page.goto("/tenants");
          await expect(page).toHaveURL(/\/tenants$/);
          await selectTenant();
          return openTenantPortalLink.count();
        },
        { timeout: 20000 }
      )
      .toBeGreaterThan(0);
  }

  await expect.poll(async () => openTenantPortalLink.count()).toBeGreaterThan(0);
  await expect(openTenantPortalLink).toBeVisible();
  await expect(openTenantPortalLink).toHaveAttribute(
    "href",
    new RegExp(`tenantSlug=${e2eEnv.tenant.slug}`)
  );

  await openTenantPortalLink.evaluate((link: HTMLAnchorElement) => link.click());

  await expect(page).toHaveURL(
    new RegExp(`/tenant-portal/login\\?tenantSlug=${e2eEnv.tenant.slug}`)
  );
  await expect(
    page.getByRole("heading", { name: /Portal Tenant|Tenant Portal/i })
  ).toBeVisible();
  await expect(page.locator('input[autocomplete="organization"]')).toHaveValue(
    e2eEnv.tenant.slug
  );
});