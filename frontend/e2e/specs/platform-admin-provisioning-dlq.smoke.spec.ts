import { expect, test } from "../support/test";
import {
  getProvisioningDispatchInfo,
  seedProvisioningDeadLetterJob,
} from "../support/backend-control";
import { loginPlatform } from "../support/auth";
import { buildE2ETenantIdentity } from "../support/e2e-data";
import { fillCreateTenantForm, openCreateTenantForm } from "../support/platform-admin";

test("platform admin can requeue filtered DLQ rows from provisioning", async ({
  page,
}) => {
  const dispatchInfo = getProvisioningDispatchInfo();
  test.skip(
    dispatchInfo.backendName !== "broker",
    "DLQ browser smoke requires provisioning broker backend"
  );

  const tenant = buildE2ETenantIdentity("provisioning-dlq");
  const errorCode = `e2e-dlq-${tenant.id}`;

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
    errorMessage: `E2E DLQ row ${tenant.id}`,
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

  await expect
    .poll(async () => {
      return dlqRow.count();
    })
    .toBeGreaterThan(0);

  const batchForm = page.locator("form.tenant-action-form").filter({
    has: page.getByText(/Reencolado en lote|Batch requeue/i),
  });
  await batchForm
    .getByRole("button", { name: /Reencolar filas DLQ filtradas|Requeue filtered DLQ rows/i })
    .click();

  const confirmDialog = page.getByRole("dialog");
  await expect(confirmDialog).toBeVisible();
  await expect(
    confirmDialog.getByRole("heading", {
      name: /Reencolar filas DLQ filtradas|Requeue filtered DLQ rows/i,
    })
  ).toBeVisible();

  await confirmDialog
    .getByRole("button", { name: /Reencolar lote|Requeue batch/i })
    .click();

  await expect(
    page
      .locator(".tenant-action-feedback--success")
      .filter({ hasText: /Reencolado DLQ|DLQ/i })
      .first()
  ).toContainText(/DLQ|queue/i);

  await expect(
    page.getByText(/No hay filas DLQ para este filtro|There are no DLQ rows for this filter/i)
  ).toBeVisible();
});
