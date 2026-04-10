import { expect, test } from "../support/test";
import { seedFailedProvisioningJob } from "../support/backend-control";
import { loginPlatform } from "../support/auth";

test("platform admin can use guided DLQ requeue from a focused row", async ({
  page,
}) => {
  const tenantSlug = "empresa-demo";
  const errorCode = `e2e-guided-requeue-${Date.now()}`;

  await loginPlatform(page);

  seedFailedProvisioningJob({
    tenantSlug,
    errorCode,
    errorMessage: `E2E guided requeue ${errorCode}`,
  });

  await page.goto(`/provisioning?tenantSlug=${tenantSlug}`);
  await expect(
    page.getByRole("heading", { name: "Provisioning", exact: true })
  ).toBeVisible();
  await page.getByRole("button", { name: /Recargar datos|Reload data/i }).click();

  const dlqTable = page.locator(".panel-card.data-table-card").filter({
    has: page.getByRole("heading", { name: /Filas DLQ|DLQ rows/i }),
  });

  const dlqRow = dlqTable
    .locator("tr")
    .filter({ hasText: errorCode })
    .filter({ hasText: tenantSlug })
    .first();

  await expect.poll(async () => dlqRow.count()).toBeGreaterThan(0);

  await dlqRow
    .getByRole("button", { name: /Guiar requeue|Guide requeue/i })
    .click();

  await expect(
    page
      .locator(".tenant-action-feedback--success")
      .filter({ hasText: /requeue guiado|guided requeue/i })
      .first()
  ).toBeVisible();

  const guidedPanel = page.locator(".panel-card").filter({
    has: page.getByText(/Requeue guiado|Guided requeue/i),
  });

  await expect(guidedPanel).toContainText(new RegExp(`#`, "i"));
  await expect(guidedPanel).toContainText(new RegExp(errorCode, "i"));

  await guidedPanel
    .getByRole("button", { name: /Reencolar job sugerido|Requeue suggested job/i })
    .click();

  await page.getByRole("button", { name: /Reencolar job|Requeue job/i }).click();

  await expect(
    page
      .locator(".tenant-action-feedback--success")
      .filter({ hasText: /Reintento de provisioning|Retry provisioning/i })
      .first()
  ).toBeVisible();
});
