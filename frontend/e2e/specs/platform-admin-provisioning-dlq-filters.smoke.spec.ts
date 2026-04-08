import { expect, test } from "../support/test";
import {
  getProvisioningDispatchInfo,
  seedProvisioningDeadLetterJob,
} from "../support/backend-control";
import { loginPlatform } from "../support/auth";
import { buildE2ETenantIdentity } from "../support/e2e-data";
import { fillCreateTenantForm, openCreateTenantForm } from "../support/platform-admin";

test("platform admin can filter DLQ rows by error text and review requeue options", async ({
  page,
}) => {
  const dispatchInfo = getProvisioningDispatchInfo();
  test.skip(
    dispatchInfo.backendName !== "broker",
    "DLQ browser smoke requires provisioning broker backend"
  );

  const tenant = buildE2ETenantIdentity("provisioning-dlq-filters");
  const errorCode = `e2e-dlq-filters-${tenant.id}`;
  const matchingErrorFragment = `target-${tenant.id}`;

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

  const matchingJob = seedProvisioningDeadLetterJob({
    tenantSlug: tenant.slug,
    errorCode,
    errorMessage: `E2E DLQ matching ${matchingErrorFragment}`,
  });

  const otherJob = seedProvisioningDeadLetterJob({
    tenantSlug: tenant.slug,
    errorCode,
    errorMessage: `E2E DLQ non-matching ${tenant.id}`,
  });

  await page.goto("/provisioning");
  await expect(page).toHaveURL(/\/provisioning$/);
  await expect(
    page.getByRole("heading", { name: "Provisioning", exact: true })
  ).toBeVisible();

  const filtersForm = page.locator("form.tenant-action-form").filter({
    has: page.getByText(/Filtros DLQ|DLQ filters/i),
  });
  await filtersForm.locator("input.form-control").nth(2).fill(tenant.slug);
  await filtersForm.locator("input.form-control").nth(3).fill(errorCode);
  await filtersForm
    .locator("input.form-control")
    .nth(4)
    .fill(matchingErrorFragment);
  await filtersForm
    .getByRole("button", { name: /Aplicar filtros|Apply filters/i })
    .click();

  const dlqTable = page.locator(".panel-card.data-table-card").filter({
    has: page.getByRole("heading", { name: /Filas DLQ|DLQ rows/i }),
  });

  const matchingRow = dlqTable
    .locator("tr")
    .filter({ hasText: `#${matchingJob.jobId}` })
    .first();

  const otherRow = dlqTable
    .locator("tr")
    .filter({ hasText: `#${otherJob.jobId}` })
    .first();

  await expect.poll(async () => matchingRow.count()).toBeGreaterThan(0);
  await expect(otherRow).toHaveCount(0);

  const batchForm = page.locator("form.tenant-action-form").filter({
    has: page.getByText(/Reencolado en lote|Batch requeue/i),
  });
  await batchForm.locator('input[type="number"]').nth(1).fill("7");
  await batchForm.locator("#dlq-reset-attempts").uncheck();

  await matchingRow.getByRole("button", { name: /Reencolar|Requeue/i }).click();

  const confirmDialog = page.getByRole("dialog");
  await expect(confirmDialog).toBeVisible();
  await expect(
    confirmDialog.getByRole("heading", {
      name: new RegExp(`Reencolar job #${matchingJob.jobId}|Requeue job #${matchingJob.jobId}`, "i"),
    })
  ).toBeVisible();
  await expect(confirmDialog.getByText(/Resetear intentos|Reset attempts/i)).toContainText(
    /no/i
  );
  await expect(
    confirmDialog.getByText(/Demora antes de reencolar|Delay before requeue/i)
  ).toContainText(/7 s/i);

  await confirmDialog
    .getByRole("button", { name: /Reencolar job|Requeue job/i })
    .click();

  await expect(
    page
      .locator(".tenant-action-feedback--success")
      .filter({ hasText: /Reintento de provisioning|Retry provisioning/i })
      .first()
  ).toContainText(/cola|queue/i);

  await expect(
    page.getByText(/No hay filas DLQ para este filtro|There are no DLQ rows for this filter/i)
  ).toBeVisible();
});
