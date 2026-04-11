import { expect, test } from "../support/test";
import {
  getProvisioningDispatchInfo,
  seedPlatformTenantCatalogRecord,
  seedProvisioningDeadLetterJob,
} from "../support/backend-control";
import { loginPlatform } from "../support/auth";
import { buildE2ETenantIdentity } from "../support/e2e-data";

test("platform admin can isolate a visible tenant plus technical layer combination from the DLQ matrix", async ({
  page,
}) => {
  const dispatchInfo = getProvisioningDispatchInfo();
  test.skip(
    dispatchInfo.backendName !== "broker",
    "DLQ browser smoke requires provisioning broker backend"
  );

  const tenantA = buildE2ETenantIdentity("dlq-matrix-a");
  const tenantB = buildE2ETenantIdentity("dlq-matrix-b");
  const sharedErrorContains = `E2E DLQ tenant technical matrix ${tenantA.id}`;

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
    tenantSlug: tenantA.slug,
    jobType: "create_tenant_database",
    errorCode: "postgres_database_bootstrap_failed",
    errorMessage: `${sharedErrorContains} pg-db-a1`,
  });
  seedProvisioningDeadLetterJob({
    tenantSlug: tenantB.slug,
    jobType: "create_tenant_database",
    errorCode: "postgres_role_bootstrap_failed",
    errorMessage: `${sharedErrorContains} pg-role-b1`,
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

  const matrixPanel = familiesPanel.locator(
    '[data-testid="provisioning-dlq-tenant-technical-matrix"]'
  );
  await expect(matrixPanel).toBeVisible();
  await expect(matrixPanel).toContainText(
    /Matriz tenant \+ capa técnica|Tenant \+ technical layer matrix/i
  );

  const matrixCards = matrixPanel.locator(
    '[data-testid="provisioning-dlq-tenant-technical-card"]'
  );
  await expect(matrixCards).toHaveCount(3);

  const tenantASchemaCard = matrixCards
    .filter({ hasText: tenantA.slug })
    .filter({ hasText: /Esquema tenant|Tenant schema/i })
    .first();
  const tenantADatabaseCard = matrixCards
    .filter({ hasText: tenantA.slug })
    .filter({ hasText: /Base postgres|Postgres database/i })
    .first();
  const tenantBRoleCard = matrixCards
    .filter({ hasText: tenantB.slug })
    .filter({ hasText: /Rol postgres|Postgres role/i })
    .first();

  await expect(tenantASchemaCard).toContainText(/2 filas|2 rows/i);
  await expect(tenantASchemaCard).toContainText(
    /Tenant Schema Sync Failed|tenant_schema_sync_failed/i
  );
  await expect(tenantADatabaseCard).toContainText(/1 fila|1 row/i);
  await expect(tenantBRoleCard).toContainText(/1 fila|1 row/i);

  await tenantASchemaCard
    .locator('[data-testid="provisioning-dlq-tenant-technical-focus"]')
    .click();

  await expect(
    page
      .locator(".tenant-action-feedback--success")
      .filter({ hasText: /combinación|combination/i })
      .first()
  ).toBeVisible();

  await expect(filtersForm.locator("input.form-control").nth(2)).toHaveValue(tenantA.slug);
  await expect(filtersForm.locator("input.form-control").nth(3)).toHaveValue(
    "tenant_schema_sync_failed"
  );

  await expect(
    matrixPanel.locator('[data-testid="provisioning-dlq-tenant-technical-card"]')
  ).toHaveCount(1);
  await expect(matrixPanel).toContainText(new RegExp(tenantA.slug, "i"));
  await expect(matrixPanel).toContainText(/Esquema tenant|Tenant schema/i);
  await expect(matrixPanel).not.toContainText(
    /Base postgres|Postgres database|Rol postgres|Postgres role/i
  );
});
