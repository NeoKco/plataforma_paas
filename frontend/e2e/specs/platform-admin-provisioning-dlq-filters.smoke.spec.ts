import { expect, test } from "@playwright/test";
import {
  getProvisioningDispatchInfo,
  seedProvisioningDeadLetterJob,
} from "../support/backend-control";
import { loginPlatform } from "../support/auth";

test("platform admin can filter DLQ rows by error text and review requeue options", async ({
  page,
}) => {
  const dispatchInfo = getProvisioningDispatchInfo();
  test.skip(
    dispatchInfo.backendName !== "broker",
    "DLQ browser smoke requires provisioning broker backend"
  );

  const uniqueSuffix = Date.now();
  const tenantName = `E2E Provisioning DLQ Filters ${uniqueSuffix}`;
  const tenantSlug = `e2e-provisioning-dlq-filters-${uniqueSuffix}`;
  const errorCode = `e2e_dlq_filters_${uniqueSuffix}`;
  const matchingErrorFragment = `target-${uniqueSuffix}`;

  await loginPlatform(page);
  await page.goto("/tenants");
  await expect(page).toHaveURL(/\/tenants$/);

  const createForm = page.locator("form.tenant-create-form").first();
  await createForm
    .getByPlaceholder(/Ej: Empresa Centro|Ex: Empresa Centro/i)
    .fill(tenantName);
  await createForm.getByPlaceholder("empresa-centro").fill(tenantSlug);
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
    tenantSlug,
    errorCode,
    errorMessage: `E2E DLQ matching ${matchingErrorFragment}`,
  });

  const otherJob = seedProvisioningDeadLetterJob({
    tenantSlug,
    errorCode,
    errorMessage: `E2E DLQ non-matching ${uniqueSuffix}`,
  });

  await page.goto("/provisioning");
  await expect(page).toHaveURL(/\/provisioning$/);
  await expect(
    page.getByRole("heading", { name: "Provisioning", exact: true })
  ).toBeVisible();

  const filtersForm = page.locator("form.tenant-action-form").filter({
    has: page.getByText(/Filtros DLQ|DLQ filters/i),
  });
  await filtersForm.locator("input.form-control").nth(2).fill(tenantSlug);
  await filtersForm.locator("input.form-control").nth(3).fill(errorCode);
  await filtersForm
    .locator("input.form-control")
    .nth(4)
    .fill(matchingErrorFragment);
  await filtersForm
    .getByRole("button", { name: /Aplicar filtros|Apply filters/i })
    .click();

  const matchingRow = page
    .locator("tr")
    .filter({ hasText: `#${matchingJob.jobId}` })
    .first();

  const otherRow = page
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