import { expect, test } from "../support/test";
import {
  getProvisioningDispatchInfo,
  seedPlatformTenantCatalogRecord,
  seedProvisioningDeadLetterJob,
} from "../support/backend-control";
import { loginPlatform } from "../support/auth";
import { buildE2ETenantIdentity } from "../support/e2e-data";

test("platform admin can prioritize and focus one visible tenant before operating DLQ families", async ({
  page,
}) => {
  const dispatchInfo = getProvisioningDispatchInfo();
  test.skip(
    dispatchInfo.backendName !== "broker",
    "DLQ browser smoke requires provisioning broker backend"
  );

  const tenantA = buildE2ETenantIdentity("dlq-ten-a");
  const tenantB = buildE2ETenantIdentity("dlq-ten-b");
  const tenantAErrorA = `e2e-ten-a-a-${tenantA.id}`;
  const tenantAErrorB = `e2e-ten-a-b-${tenantA.id}`;
  const tenantBError = `e2e-ten-b-a-${tenantB.id}`;
  const sharedErrorContains = `E2E DLQ tenant focus ${tenantA.id}`;

  seedPlatformTenantCatalogRecord({
    name: tenantA.name,
    slug: tenantA.slug,
    tenantType: "empresa",
    adminFullName: tenantA.adminFullName,
    adminEmail: tenantA.adminEmail,
    adminPassword: tenantA.adminPassword,
  });
  seedPlatformTenantCatalogRecord({
    name: tenantB.name,
    slug: tenantB.slug,
    tenantType: "empresa",
    adminFullName: tenantB.adminFullName,
    adminEmail: tenantB.adminEmail,
    adminPassword: tenantB.adminPassword,
  });

  seedProvisioningDeadLetterJob({
    tenantSlug: tenantA.slug,
    errorCode: tenantAErrorA,
    errorMessage: `${sharedErrorContains} A1`,
  });
  seedProvisioningDeadLetterJob({
    tenantSlug: tenantA.slug,
    errorCode: tenantAErrorB,
    errorMessage: `${sharedErrorContains} A2`,
  });
  seedProvisioningDeadLetterJob({
    tenantSlug: tenantB.slug,
    errorCode: tenantBError,
    errorMessage: `${sharedErrorContains} B1`,
  });

  await loginPlatform(page);
  await page.goto("/provisioning");
  await expect(
    page.getByRole("heading", { name: "Provisioning", exact: true })
  ).toBeVisible();

  const familiesPanel = page.locator(".panel-card").filter({
    has: page.getByText(/Familias DLQ visibles|Visible DLQ families/i),
  });
  await expect(familiesPanel).toBeVisible();

  const filtersForm = page.locator("form.tenant-action-form").filter({
    has: page.getByText(/Filtros DLQ|DLQ filters/i),
  });
  await filtersForm.locator("input.form-control").nth(4).fill(sharedErrorContains);
  await filtersForm
    .getByRole("button", { name: /Aplicar filtros|Apply filters/i })
    .click();

  const tenantRecommendation = familiesPanel.locator(
    '[data-testid="provisioning-dlq-tenant-recommendation"]'
  );
  await expect(tenantRecommendation).toContainText(
    /Prioriza un tenant visible|Prioritize one visible tenant/i
  );
  await expect(tenantRecommendation).toContainText(new RegExp(tenantA.slug, "i"));

  const tenantSummary = familiesPanel.locator(
    '[data-testid="provisioning-dlq-tenant-summary"]'
  );
  const tenantACard = tenantSummary
    .locator('[data-testid="provisioning-dlq-tenant-card"]')
    .filter({ hasText: tenantA.slug })
    .first();
  const tenantBCard = tenantSummary
    .locator('[data-testid="provisioning-dlq-tenant-card"]')
    .filter({ hasText: tenantB.slug })
    .first();

  await expect(tenantACard).toContainText(/2 filas|2 rows/i);
  await expect(tenantBCard).toContainText(/1 fila|1 row/i);

  await tenantRecommendation
    .locator('[data-testid="provisioning-dlq-tenant-recommendation-primary"]')
    .click();

  await expect(filtersForm.locator("input.form-control").nth(2)).toHaveValue(tenantA.slug);
  await expect(tenantRecommendation).toContainText(
    /Tenant ya aislado|Tenant already isolated/i
  );

  await expect
    .poll(async () => {
      const cards = await familiesPanel
        .locator('[data-testid="provisioning-dlq-family-card"]')
        .allTextContents();
      return cards.every((text) => text.includes(tenantA.slug));
    })
    .toBe(true);

  await expect(
    familiesPanel
      .locator('[data-testid="provisioning-dlq-family-card"]')
      .filter({ hasText: tenantB.slug })
  ).toHaveCount(0);
});
