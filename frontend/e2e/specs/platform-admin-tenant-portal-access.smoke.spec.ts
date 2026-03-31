import { expect, test } from "@playwright/test";
import { loginPlatform } from "../support/auth";
import { e2eEnv } from "../support/env";

test("platform admin can open tenant portal from tenants with slug prefilled", async ({
  page,
}) => {
  await loginPlatform(page);

  await page.goto("/tenants");
  await expect(page).toHaveURL(/\/tenants$/);
  await expect(page.getByRole("heading", { name: /Tenants/i })).toBeVisible();

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

  const openTenantPortalLink = page.getByRole("link", {
    name: /Abrir portal tenant|Open tenant portal/i,
  });

  await expect(openTenantPortalLink).toBeVisible();
  await expect(openTenantPortalLink).toHaveAttribute(
    "href",
    new RegExp(`tenantSlug=${e2eEnv.tenant.slug}`)
  );

  await openTenantPortalLink.click();

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