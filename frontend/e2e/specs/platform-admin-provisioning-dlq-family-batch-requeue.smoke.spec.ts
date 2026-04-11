import { expect, test } from "../support/test";
import {
  getProvisioningDispatchInfo,
  seedPlatformTenantCatalogRecord,
  seedProvisioningDeadLetterJob,
} from "../support/backend-control";
import { loginPlatform } from "../support/auth";
import { buildE2ETenantIdentity } from "../support/e2e-data";

test("platform admin can batch requeue multiple visible DLQ families when the selection is homogeneous", async ({
  page,
}) => {
  const dispatchInfo = getProvisioningDispatchInfo();
  test.skip(
    dispatchInfo.backendName !== "broker",
    "DLQ browser smoke requires provisioning broker backend"
  );

  const tenant = buildE2ETenantIdentity("provisioning-dlq-family-batch");
  const familyOneErrorCode = `e2e-dlq-family-batch-a-${tenant.id}`;
  const familyTwoErrorCode = `e2e-dlq-family-batch-b-${tenant.id}`;
  const mixedJobTypeErrorCode = `e2e-dlq-family-batch-mixed-${tenant.id}`;

  seedPlatformTenantCatalogRecord({
    name: tenant.name,
    slug: tenant.slug,
    tenantType: "empresa",
    adminFullName: tenant.adminFullName,
    adminEmail: tenant.adminEmail,
    adminPassword: tenant.adminPassword,
  });

  const familyOneJob = seedProvisioningDeadLetterJob({
    tenantSlug: tenant.slug,
    errorCode: familyOneErrorCode,
    errorMessage: `E2E DLQ family batch A ${tenant.id}`,
  });
  const familyTwoJob = seedProvisioningDeadLetterJob({
    tenantSlug: tenant.slug,
    errorCode: familyTwoErrorCode,
    errorMessage: `E2E DLQ family batch B ${tenant.id}`,
  });
  const mixedJobTypeJob = seedProvisioningDeadLetterJob({
    tenantSlug: tenant.slug,
    jobType: "deprovision_tenant_database",
    errorCode: mixedJobTypeErrorCode,
    errorMessage: `E2E DLQ family batch mixed ${tenant.id}`,
  });

  await loginPlatform(page);
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

  const familyOneCard = familiesPanel
    .locator('[data-testid="provisioning-dlq-family-card"]')
    .filter({ hasText: tenant.slug })
    .filter({ hasText: familyOneErrorCode })
    .first();

  const familyTwoCard = familiesPanel
    .locator('[data-testid="provisioning-dlq-family-card"]')
    .filter({ hasText: tenant.slug })
    .filter({ hasText: familyTwoErrorCode })
    .first();

  const mixedJobTypeCard = familiesPanel
    .locator('[data-testid="provisioning-dlq-family-card"]')
    .filter({ hasText: tenant.slug })
    .filter({ hasText: mixedJobTypeErrorCode })
    .first();

  await expect(familyOneCard).toBeVisible();
  await expect(familyTwoCard).toBeVisible();
  await expect(mixedJobTypeCard).toBeVisible();

  const batchSummary = familiesPanel.locator(
    '[data-testid="provisioning-dlq-family-batch-summary"]'
  );
  const batchButton = batchSummary.locator(
    '[data-testid="provisioning-dlq-family-batch-requeue"]'
  );

  await expect(batchSummary).toContainText(/sin selección|no selection/i);
  await expect(batchButton).toBeDisabled();

  await familyOneCard.locator('[data-testid="provisioning-dlq-family-select"]').click();
  await mixedJobTypeCard
    .locator('[data-testid="provisioning-dlq-family-select"]')
    .click();

  await expect(batchSummary).toContainText(/mezcla tipos de job|mixes job types/i);
  await expect(batchButton).toBeDisabled();

  await mixedJobTypeCard
    .locator('[data-testid="provisioning-dlq-family-select"]')
    .click();
  await familyTwoCard.locator('[data-testid="provisioning-dlq-family-select"]').click();

  await expect(batchSummary).toContainText(/2 familias \/ 2 filas|2 families \/ 2 rows/i);
  await expect(batchSummary).toContainText(/homogénea|homogeneous/i);
  await expect(batchButton).toBeEnabled();

  await batchButton.click();

  const confirmDialog = page.getByRole("dialog");
  await expect(confirmDialog).toBeVisible();
  await expect(
    confirmDialog.getByRole("heading", {
      name: /Reencolar familias DLQ|Requeue DLQ families/i,
    })
  ).toBeVisible();
  await expect(confirmDialog).toContainText(new RegExp(tenant.slug, "i"));
  await expect(confirmDialog).toContainText(
    /Familias seleccionadas:\s*2|Selected families:\s*2|2 selected families/i
  );
  await expect(confirmDialog).toContainText(
    /Filas visibles totales:\s*2|Total visible rows:\s*2|2 total visible rows/i
  );

  await confirmDialog
    .getByRole("button", { name: /Reencolar familias|Requeue families/i })
    .click();

  await expect(
    page
      .locator(".tenant-action-feedback--success")
      .filter({ hasText: /Reencolado DLQ|DLQ/i })
      .first()
  ).toContainText(/2 familias|2 visible families|2 families/i);

  await expect(
    familiesPanel
      .locator('[data-testid="provisioning-dlq-family-card"]')
      .filter({ hasText: familyOneErrorCode })
  ).toHaveCount(0);
  await expect(
    familiesPanel
      .locator('[data-testid="provisioning-dlq-family-card"]')
      .filter({ hasText: familyTwoErrorCode })
  ).toHaveCount(0);
  await expect(
    familiesPanel
      .locator('[data-testid="provisioning-dlq-family-card"]')
      .filter({ hasText: mixedJobTypeErrorCode })
  ).toHaveCount(1);

  const dlqTable = page.locator(".panel-card.data-table-card").filter({
    has: page.getByRole("heading", { name: /Filas DLQ|DLQ rows/i }),
  });

  await expect(
    dlqTable.locator("tr").filter({ hasText: `#${familyOneJob.jobId}` })
  ).toHaveCount(0);
  await expect(
    dlqTable.locator("tr").filter({ hasText: `#${familyTwoJob.jobId}` })
  ).toHaveCount(0);
  await expect(
    dlqTable.locator("tr").filter({ hasText: `#${mixedJobTypeJob.jobId}` })
  ).toHaveCount(1);
});
