import { expect, test } from "../support/test";
import { seedFailedProvisioningJob } from "../support/backend-control";
import { loginPlatform } from "../support/auth";

test("platform admin can prefill DLQ investigation from failures by code", async ({
  page,
}) => {
  const tenantSlug = "empresa-demo";
  const errorCode = `e2e-dlq-investigation-${Date.now()}`;

  await loginPlatform(page);

  seedFailedProvisioningJob({
    tenantSlug,
    errorCode,
    errorMessage: `E2E investigate DLQ ${errorCode}`,
  });

  await page.goto(`/provisioning?tenantSlug=${tenantSlug}`);
  await expect(page).toHaveURL(new RegExp(`/provisioning\\?tenantSlug=${tenantSlug}`));
  await expect(
    page.getByRole("heading", { name: "Provisioning", exact: true })
  ).toBeVisible();
  await page.getByRole("button", { name: /Recargar datos|Reload data/i }).click();

  const failureTable = page.locator(".panel-card.data-table-card").filter({
    has: page.getByRole("heading", { name: /Fallos por código|Failures by code/i }),
  });

  const failureRow = failureTable
    .locator("tr")
    .filter({ hasText: tenantSlug })
    .filter({ hasText: errorCode })
    .first();

  await expect.poll(async () => failureRow.count()).toBeGreaterThan(0);

  await failureRow
    .getByRole("button", { name: /Investigar en DLQ|Investigate in DLQ/i })
    .click();

  await expect(
    page
      .locator(".tenant-action-feedback--success")
      .filter({ hasText: /Investigación DLQ|DLQ investigation/i })
      .first()
  ).toContainText(/DLQ/i);

  const filtersForm = page.locator("form.tenant-action-form").filter({
    has: page.getByText(/Filtros DLQ|DLQ filters/i),
  });
  await expect(filtersForm.locator("input.form-control").nth(2)).toHaveValue(
    tenantSlug
  );
  await expect(filtersForm.locator("input.form-control").nth(3)).toHaveValue(
    errorCode
  );
});
