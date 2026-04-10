import { expect, test } from "../support/test";
import {
  getProvisioningDispatchInfo,
  seedProvisioningDeadLetterJob,
} from "../support/backend-control";
import { loginPlatform } from "../support/auth";
import { buildE2ETenantIdentity } from "../support/e2e-data";
import { fillCreateTenantForm, openCreateTenantForm } from "../support/platform-admin";

test("platform admin can use guided DLQ requeue from a focused row", async ({
  page,
}) => {
  const dispatchInfo = getProvisioningDispatchInfo();
  test.skip(
    dispatchInfo.backendName !== "broker",
    "DLQ browser smoke requires provisioning broker backend"
  );

  const tenant = buildE2ETenantIdentity("provisioning-guided-requeue");
  const errorCode = `e2e-guided-requeue-${tenant.id}`;

  await loginPlatform(page);
  await page.goto("/tenants");
  await expect(page).toHaveURL(/\/tenants$/);

  const createForm = await openCreateTenantForm(page);
  await fillCreateTenantForm(createForm, tenant);
  await createForm
    .getByRole("button", { name: /Crear tenant|Create tenant/ })
    .click();

  await expect(
    page
      .locator(".tenant-action-feedback--success")
      .filter({ hasText: /Alta de tenant|Create tenant/i })
      .first()
  ).toContainText(/creado|created/i);

  const seededJob = seedProvisioningDeadLetterJob({
    tenantSlug: tenant.slug,
    errorCode,
    errorMessage: `E2E guided DLQ ${tenant.id}`,
  });

  await page.goto(`/provisioning?tenantSlug=${tenant.slug}`);
  await expect(
    page.getByRole("heading", { name: "Provisioning", exact: true })
  ).toBeVisible();

  const filtersForm = page.locator("form.tenant-action-form").filter({
    has: page.getByText(/Filtros DLQ|DLQ filters/i),
  });
  await filtersForm.locator("input.form-control").nth(2).fill(tenant.slug);
  await filtersForm.locator("input.form-control").nth(3).fill(errorCode);
  await filtersForm
    .getByRole("button", { name: /Aplicar filtros|Apply filters/i })
    .click();

  const dlqTable = page.locator(".panel-card.data-table-card").filter({
    has: page.getByRole("heading", { name: /Filas DLQ|DLQ rows/i }),
  });

  const dlqRow = dlqTable
    .locator("tr")
    .filter({ hasText: `#${seededJob.jobId}` })
    .filter({ hasText: errorCode })
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

  await expect(guidedPanel).toContainText(new RegExp(`#${seededJob.jobId}`, "i"));
  await expect(guidedPanel).toContainText(new RegExp(errorCode, "i"));

  await guidedPanel
    .getByRole("button", { name: /Reencolar job sugerido|Requeue suggested job/i })
    .click();

  const confirmDialog = page.getByRole("dialog");
  await expect(confirmDialog).toBeVisible();
  await expect(
    confirmDialog.getByRole("heading", {
      name: new RegExp(`Reencolar job #${seededJob.jobId}|Requeue job #${seededJob.jobId}`, "i"),
    })
  ).toBeVisible();

  await confirmDialog
    .getByRole("button", { name: /Reencolar job|Requeue job/i })
    .click();

  await expect(
    page
      .locator(".tenant-action-feedback--success")
      .filter({ hasText: /Reintento de provisioning|Retry provisioning/i })
      .first()
  ).toContainText(/cola|queue/i);
});
