import { expect, test } from "../support/test";
import { loginPlatform } from "../support/auth";

test("platform admin can trigger portable tenant CSV export from tenants", async ({
  page,
}) => {
  await loginPlatform(page);
  await page.goto("/tenants");
  await expect(page).toHaveURL(/\/tenants$/);

  const tenantCard = page.locator(".tenant-list button").first();
  await expect(tenantCard).toBeVisible();
  await tenantCard.click();

  const exportButton = page.getByRole("button", {
    name: /Exportar CSV portable|Export portable CSV/i,
  });
  await expect(exportButton).toBeVisible();

  const downloadPromise = page
    .waitForEvent("download", { timeout: 15000 })
    .catch(() => null);

  await exportButton.click();

  await expect(
    page.getByText(/Últimos exports portables|Latest portable exports/i)
  ).toBeVisible();
  await expect(
    page.getByText(/portable-export-job|portable export/i).first()
  ).toBeVisible({ timeout: 15000 });

  const download = await downloadPromise;
  if (download) {
    expect(download.suggestedFilename()).toMatch(/\.zip$/i);
  }
});
