import { expect, test } from "../support/test";
import {
  getProvisioningDispatchInfo,
  seedProvisioningDeadLetterJob,
  waitForTenantCatalogRecord,
} from "../support/backend-control";
import { loginPlatform } from "../support/auth";
import { buildE2ETenantIdentity } from "../support/e2e-data";
import { fillCreateTenantForm, openCreateTenantForm } from "../support/platform-admin";

test("platform admin can requeue a visible DLQ family directly from the broker summary", async ({
  page,
}) => {
  const dispatchInfo = getProvisioningDispatchInfo();
  test.skip(
    dispatchInfo.backendName !== "broker",
    "DLQ browser smoke requires provisioning broker backend"
  );

  const tenant = buildE2ETenantIdentity("provisioning-dlq-family-requeue");
  const targetErrorCode = `e2e-dlq-family-requeue-a-${tenant.id}`;
  const otherErrorCode = `e2e-dlq-family-requeue-b-${tenant.id}`;

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
  await waitForTenantCatalogRecord(tenant.slug);

  const familyAJobOne = seedProvisioningDeadLetterJob({
    tenantSlug: tenant.slug,
    errorCode: targetErrorCode,
    errorMessage: `E2E DLQ family requeue A1 ${tenant.id}`,
  });
  const familyAJobTwo = seedProvisioningDeadLetterJob({
    tenantSlug: tenant.slug,
    errorCode: targetErrorCode,
    errorMessage: `E2E DLQ family requeue A2 ${tenant.id}`,
  });
  const familyBJob = seedProvisioningDeadLetterJob({
    tenantSlug: tenant.slug,
    errorCode: otherErrorCode,
    errorMessage: `E2E DLQ family requeue B ${tenant.id}`,
  });

  await page.goto("/provisioning");
  await expect(
    page.getByRole("heading", { name: "Provisioning", exact: true })
  ).toBeVisible();

  const filtersForm = page.locator("form.tenant-action-form").filter({
    has: page.getByText(/Filtros DLQ|DLQ filters/i),
  });
  await filtersForm.locator("input.form-control").nth(2).fill(tenant.slug);
  await filtersForm
    .getByRole("button", { name: /Aplicar filtros|Apply filters/i })
    .click();

  const familiesPanel = page.locator(".panel-card").filter({
    has: page.getByText(/Familias DLQ visibles|Visible DLQ families/i),
  });
  await expect(familiesPanel).toBeVisible();

  const familyACard = familiesPanel
    .locator('[data-testid="provisioning-dlq-family-card"]')
    .filter({ hasText: tenant.slug })
    .filter({ hasText: targetErrorCode })
    .first();

  const familyBCard = familiesPanel
    .locator('[data-testid="provisioning-dlq-family-card"]')
    .filter({ hasText: tenant.slug })
    .filter({ hasText: otherErrorCode })
    .first();

  await expect(familyACard).toContainText(/2 filas|2 rows/i);
  await expect(familyBCard).toContainText(/1 fila|1 row/i);

  await familyACard
    .locator('[data-testid="provisioning-dlq-family-requeue"]')
    .click();

  const confirmDialog = page.getByRole("dialog");
  await expect(confirmDialog).toBeVisible();
  await expect(
    confirmDialog.getByRole("heading", {
      name: /Reencolar familia DLQ|Requeue DLQ family/i,
    })
  ).toBeVisible();
  await expect(confirmDialog).toContainText(new RegExp(tenant.slug, "i"));
  await expect(confirmDialog).toContainText(new RegExp(targetErrorCode, "i"));
  await expect(confirmDialog).toContainText(/2 filas visibles|2 visible family rows|2 row/i);

  await confirmDialog
    .getByRole("button", { name: /Reencolar familia|Requeue family/i })
    .click();

  await expect(
    page
      .locator(".tenant-action-feedback--success")
      .filter({ hasText: /Reencolado DLQ|DLQ/i })
      .first()
  ).toContainText(/cola|queue/i);

  await expect(
    familiesPanel
      .locator('[data-testid="provisioning-dlq-family-card"]')
      .filter({ hasText: targetErrorCode })
  ).toHaveCount(0);
  await expect(
    familiesPanel
      .locator('[data-testid="provisioning-dlq-family-card"]')
      .filter({ hasText: otherErrorCode })
  ).toHaveCount(1);

  const dlqTable = page.locator(".panel-card.data-table-card").filter({
    has: page.getByRole("heading", { name: /Filas DLQ|DLQ rows/i }),
  });

  await expect(
    dlqTable.locator("tr").filter({ hasText: `#${familyAJobOne.jobId}` })
  ).toHaveCount(0);
  await expect(
    dlqTable.locator("tr").filter({ hasText: `#${familyAJobTwo.jobId}` })
  ).toHaveCount(0);
  await expect(
    dlqTable.locator("tr").filter({ hasText: `#${familyBJob.jobId}` })
  ).toHaveCount(1);
});
