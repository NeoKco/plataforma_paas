import { expect, test } from "../support/test";
import { loginPlatform } from "../support/auth";
import { seedProvisioningObservabilityHistory } from "../support/backend-control";

test("platform admin can review provisioning observability history", async ({
  page,
}) => {
  const tenantSlug = "empresa-demo";
  const workerProfile = `e2e-worker-${Date.now()}`;
  const captureKey = `e2e-observability-${Date.now()}`;
  const alertCode = "tenant_failed_jobs_threshold_exceeded";
  const message = `E2E observability history ${captureKey}`;

  seedProvisioningObservabilityHistory({
    tenantSlug,
    captureKey,
    workerProfile,
    alertCode,
    severity: "error",
    message,
  });

  await loginPlatform(page);
  await page.goto(`/provisioning?tenantSlug=${tenantSlug}`);
  await expect(
    page.getByRole("heading", { name: "Provisioning", exact: true })
  ).toBeVisible();

  const observabilityCard = page.locator(".panel-card").filter({
    has: page.getByRole("heading", {
      name: /Observabilidad visible|Visible observability/i,
    }),
  });

  await observabilityCard.locator("input.form-control").nth(1).fill(workerProfile);
  await observabilityCard.locator("input.form-control").nth(2).fill(alertCode);
  await observabilityCard.locator("select.form-select").selectOption("error");
  await observabilityCard
    .getByRole("button", { name: /Recargar observabilidad|Reload observability/i })
    .click();

  const snapshotTable = page.locator(".panel-card.data-table-card").filter({
    has: page.getByRole("heading", {
      name: /Snapshots recientes por tenant|Recent tenant snapshots/i,
    }),
  });

  const snapshotRow = snapshotTable
    .locator("tr")
    .filter({ hasText: tenantSlug })
    .filter({ hasText: "97" })
    .filter({ hasText: "14" })
    .filter({ hasText: "5" })
    .filter({ hasText: "3" })
    .first();

  await expect.poll(async () => snapshotRow.count()).toBeGreaterThan(0);

  const alertHistoryTable = page.locator(".panel-card.data-table-card").filter({
    has: page.getByRole("heading", {
      name: /Historial de alertas operativas|Operational alert history/i,
    }),
  });

  const alertHistoryRow = alertHistoryTable
    .locator("tr")
    .filter({ hasText: workerProfile })
    .filter({ hasText: alertCode })
    .filter({ hasText: message })
    .first();

  await expect.poll(async () => alertHistoryRow.count()).toBeGreaterThan(0);
  await expect(alertHistoryRow).toContainText(/error/i);
});
