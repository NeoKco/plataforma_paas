import { expect, test } from "../support/test";
import { loginPlatform } from "../support/auth";
import { e2eEnv } from "../support/env";

test("platform admin can open provisioning with tenant context from tenants", async ({
  page,
}) => {
  async function selectTenant() {
    await page.locator("input.form-control").first().fill(e2eEnv.tenant.slug);

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

  const openProvisioningLink = page.getByRole("link", {
    name: /Abrir provisioning|Open provisioning/i,
  });

  await expect(openProvisioningLink).toBeVisible();
  await openProvisioningLink.click();

  await expect(page).toHaveURL(
    new RegExp(`/provisioning\\?tenantSlug=${e2eEnv.tenant.slug}`)
  );
  await expect(
    page.getByRole("heading", { name: "Provisioning", exact: true })
  ).toBeVisible();
  await expect(
    page.getByLabel(/Foco tenant|Tenant focus/i)
  ).toHaveValue(e2eEnv.tenant.slug);

  await expect
    .poll(async () => {
      return page.getByText(e2eEnv.tenant.slug, { exact: true }).count();
    })
    .toBeGreaterThan(0);
});
