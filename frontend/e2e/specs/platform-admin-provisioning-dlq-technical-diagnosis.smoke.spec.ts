import { expect, test } from "../support/test";
import {
  getProvisioningDispatchInfo,
  seedPlatformTenantCatalogRecord,
  seedProvisioningDeadLetterJob,
} from "../support/backend-control";
import { loginPlatform } from "../support/auth";
import { buildE2ETenantIdentity } from "../support/e2e-data";

test("platform admin can diagnose the visible DLQ subset by technical database/schema layer", async ({
  page,
}) => {
  const dispatchInfo = getProvisioningDispatchInfo();
  test.skip(
    dispatchInfo.backendName !== "broker",
    "DLQ browser smoke requires provisioning broker backend"
  );

  const tenantA = buildE2ETenantIdentity("dlq-tech-a");
  const tenantB = buildE2ETenantIdentity("dlq-tech-b");
  const sharedErrorContains = `E2E DLQ technical diagnosis ${tenantA.id}`;

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
    jobType: "sync_tenant_schema",
    errorCode: "tenant_schema_sync_failed",
    errorMessage: `${sharedErrorContains} schema-a1`,
  });
  seedProvisioningDeadLetterJob({
    tenantSlug: tenantA.slug,
    jobType: "sync_tenant_schema",
    errorCode: "tenant_schema_sync_failed",
    errorMessage: `${sharedErrorContains} schema-a2`,
  });
  seedProvisioningDeadLetterJob({
    tenantSlug: tenantB.slug,
    jobType: "repair_tenant_schema",
    errorCode: "tenant_schema_sync_failed",
    errorMessage: `${sharedErrorContains} schema-b1`,
  });
  seedProvisioningDeadLetterJob({
    tenantSlug: tenantA.slug,
    jobType: "create_tenant_database",
    errorCode: "postgres_database_bootstrap_failed",
    errorMessage: `${sharedErrorContains} pg-db`,
  });
  seedProvisioningDeadLetterJob({
    tenantSlug: tenantB.slug,
    jobType: "create_tenant_database",
    errorCode: "postgres_role_bootstrap_failed",
    errorMessage: `${sharedErrorContains} pg-role`,
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

  const diagnosisPanel = familiesPanel.locator(
    '[data-testid="provisioning-dlq-technical-diagnosis"]'
  );
  await expect(diagnosisPanel).toContainText(
    /Diagnóstico dominante: Esquema tenant|Dominant diagnosis: Tenant schema/i
  );
  await expect(diagnosisPanel).toContainText(
    /Código dominante: Tenant Schema Sync Failed|Dominant code: Tenant Schema Sync Failed/i
  );

  const diagnosisCards = diagnosisPanel.locator(
    '[data-testid="provisioning-dlq-technical-card"]'
  );
  await expect(diagnosisCards.filter({ hasText: /Esquema tenant|Tenant schema/i })).toHaveCount(
    1
  );
  await expect(
    diagnosisCards.filter({ hasText: /Base postgres|Postgres database/i })
  ).toHaveCount(1);
  await expect(
    diagnosisCards.filter({ hasText: /Rol postgres|Postgres role/i })
  ).toHaveCount(1);

  await diagnosisPanel
    .locator('[data-testid="provisioning-dlq-technical-focus-error"]')
    .click();

  await expect(filtersForm.locator("input.form-control").nth(3)).toHaveValue(
    "tenant_schema_sync_failed"
  );

  await expect(diagnosisPanel).toContainText(
    /Diagnóstico dominante: Esquema tenant|Dominant diagnosis: Tenant schema/i
  );
  await expect(
    diagnosisPanel.locator('[data-testid="provisioning-dlq-technical-card"]')
  ).toHaveCount(1);
  await expect(diagnosisPanel).not.toContainText(
    /Base postgres|Postgres database|Rol postgres|Postgres role/i
  );

  await expect(
    familiesPanel.locator('[data-testid="provisioning-dlq-family-card"]')
  ).toHaveCount(3);
  await expect(familiesPanel).not.toContainText(
    /Postgres Database Bootstrap Failed|Postgres Role Bootstrap Failed/i
  );
});
