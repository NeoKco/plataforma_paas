import { expect, test } from "../support/test";
import { loginPlatform } from "../support/auth";

test("platform admin login and core navigation smoke", async ({ page }) => {
  await loginPlatform(page);

  await page.goto("/tenants");
  await expect(page).toHaveURL(/\/tenants$/);
  await expect(
    page.getByRole("heading", { name: /Tenants|Tenants/ })
  ).toBeVisible();

  await page.goto("/provisioning");
  await expect(page).toHaveURL(/\/provisioning$/);
  await expect(
    page.getByRole("heading", { name: /Provisioning/ })
  ).toBeVisible();
});
