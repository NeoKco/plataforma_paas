import { expect, test } from "../support/test";
import {
  getProvisioningDispatchInfo,
  seedPlatformTenantCatalogRecord,
  seedProvisioningDeadLetterJob,
} from "../support/backend-control";
import { loginPlatform } from "../support/auth";
import { buildE2ETenantIdentity } from "../support/e2e-data";

test("platform admin sees a family-level operational recommendation that changes with the visible selection", async ({
  page,
}) => {
  const dispatchInfo = getProvisioningDispatchInfo();
  test.skip(
    dispatchInfo.backendName !== "broker",
    "DLQ browser smoke requires provisioning broker backend"
  );

  const tenant = buildE2ETenantIdentity("dlq-fam-rec");
  const singleErrorCode = `e2e-fam-rec-a-${tenant.id}`;
  const sameBatchErrorCode = `e2e-fam-rec-b-${tenant.id}`;
  const mixedErrorCode = `e2e-fam-rec-c-${tenant.id}`;

  seedPlatformTenantCatalogRecord({
    name: tenant.name,
    slug: tenant.slug,
    tenantType: "empresa",
    adminFullName: tenant.adminFullName,
    adminEmail: tenant.adminEmail,
    adminPassword: tenant.adminPassword,
  });

  seedProvisioningDeadLetterJob({
    tenantSlug: tenant.slug,
    errorCode: singleErrorCode,
    errorMessage: `E2E DLQ family recommendation A ${tenant.id}`,
  });
  seedProvisioningDeadLetterJob({
    tenantSlug: tenant.slug,
    errorCode: sameBatchErrorCode,
    errorMessage: `E2E DLQ family recommendation B ${tenant.id}`,
  });
  seedProvisioningDeadLetterJob({
    tenantSlug: tenant.slug,
    jobType: "deprovision_tenant_database",
    errorCode: mixedErrorCode,
    errorMessage: `E2E DLQ family recommendation mixed ${tenant.id}`,
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

  const recommendationPanel = familiesPanel.locator(
    '[data-testid="provisioning-dlq-family-recommendation"]'
  );
  await expect(recommendationPanel).toContainText(
    /Selecciona una familia visible|Select a visible family/i
  );

  const familySingleCard = familiesPanel
    .locator('[data-testid="provisioning-dlq-family-card"]')
    .filter({ hasText: tenant.slug })
    .filter({ hasText: singleErrorCode })
    .first();
  const familyBatchCard = familiesPanel
    .locator('[data-testid="provisioning-dlq-family-card"]')
    .filter({ hasText: tenant.slug })
    .filter({ hasText: sameBatchErrorCode })
    .first();
  const familyMixedCard = familiesPanel
    .locator('[data-testid="provisioning-dlq-family-card"]')
    .filter({ hasText: tenant.slug })
    .filter({ hasText: mixedErrorCode })
    .first();

  await expect(familySingleCard).toContainText(/foco fino|single requeue|fine focus/i);
  await expect(familyBatchCard).toContainText(/foco fino|single requeue|fine focus/i);
  await expect(familyMixedCard).toContainText(/foco fino|single requeue|fine focus/i);

  await familySingleCard
    .locator('[data-testid="provisioning-dlq-family-select"]')
    .click();

  await expect(recommendationPanel).toContainText(
    /Fila única sugerida|Single-row suggestion/i
  );
  await expect(
    recommendationPanel.locator(
      '[data-testid="provisioning-dlq-family-recommendation-primary"]'
    )
  ).toContainText(/Enfocar fila sugerida|Focus suggested row/i);

  await familyBatchCard
    .locator('[data-testid="provisioning-dlq-family-select"]')
    .click();

  await expect(recommendationPanel).toContainText(
    /Batch homogéneo listo|Homogeneous batch ready/i
  );
  await expect(
    recommendationPanel.locator(
      '[data-testid="provisioning-dlq-family-recommendation-primary"]'
    )
  ).toContainText(/Reencolar batch sugerido|Requeue suggested batch/i);

  await familyMixedCard
    .locator('[data-testid="provisioning-dlq-family-select"]')
    .click();

  await expect(recommendationPanel).toContainText(/Selección mixta|Mixed selection/i);
  await expect(
    recommendationPanel.locator(
      '[data-testid="provisioning-dlq-family-recommendation-secondary"]'
    )
  ).toContainText(/Limpiar selección|Clear selection/i);
});
