import { expect, test } from "@playwright/test";
import {
  getProvisioningDispatchInfo,
  seedProvisioningDeadLetterJob,
} from "../support/backend-control";
import { loginPlatform } from "../support/auth";

test("platform admin can requeue an individual DLQ row from provisioning", async ({
  page,
}) => {
  const dispatchInfo = getProvisioningDispatchInfo();
  test.skip(
    dispatchInfo.backendName !== "broker",
    "DLQ browser smoke requires provisioning broker backend"
  );

  const uniqueSuffix = Date.now();
  const tenantName = `E2E Provisioning DLQ Row ${uniqueSuffix}`;
  const tenantSlug = `e2e-provisioning-dlq-row-${uniqueSuffix}`;
  const errorCode = `e2e_dlq_row_${uniqueSuffix}`;

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

  const seededJob = seedProvisioningDeadLetterJob({
    tenantSlug,
    errorCode,
    errorMessage: `E2E DLQ row single requeue ${uniqueSuffix}`,
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

  await dlqRow.getByRole("button", { name: /Reencolar|Requeue/i }).click();

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

  await expect(
    page.getByText(/No hay filas DLQ para este filtro|There are no DLQ rows for this filter/i)
  ).toBeVisible();
});