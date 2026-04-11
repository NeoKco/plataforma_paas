import { expect, test } from "../support/test";
import {
  getProvisioningDispatchInfo,
  seedProvisioningDeadLetterJob,
} from "../support/backend-control";
import { loginPlatform } from "../support/auth";
import { buildE2ETenantIdentity } from "../support/e2e-data";
import { fillCreateTenantForm, openCreateTenantForm } from "../support/platform-admin";

test("platform admin can focus a visible DLQ family from the broker summary", async ({
  page,
}) => {
  const dispatchInfo = getProvisioningDispatchInfo();
  test.skip(
    dispatchInfo.backendName !== "broker",
    "DLQ browser smoke requires provisioning broker backend"
  );

  const tenant = buildE2ETenantIdentity("provisioning-dlq-family");
  const errorCode = `e2e-dlq-family-${tenant.id}`;

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

  seedProvisioningDeadLetterJob({
    tenantSlug: tenant.slug,
    errorCode,
    errorMessage: `E2E DLQ family A ${tenant.id}`,
  });
  seedProvisioningDeadLetterJob({
    tenantSlug: tenant.slug,
    errorCode,
    errorMessage: `E2E DLQ family B ${tenant.id}`,
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
  await expect(familiesPanel).toContainText(new RegExp(tenant.slug, "i"));
  await expect(familiesPanel).toContainText(new RegExp(errorCode, "i"));
  await expect(familiesPanel).toContainText(/2 filas|2 rows/i);

  const familyCard = familiesPanel
    .locator('[data-testid="provisioning-dlq-family-card"]')
    .filter({
      hasText: tenant.slug,
    })
    .filter({
      hasText: errorCode,
    })
    .first();

  await expect(familyCard).toBeVisible();

  await familyCard
    .locator('[data-testid="provisioning-dlq-family-focus"]')
    .click();

  await expect(
    page
      .locator(".tenant-action-feedback--success")
      .filter({ hasText: /familia DLQ|DLQ family/i })
      .first()
  ).toBeVisible();

  await expect(filtersForm.locator("input.form-control").nth(1)).toHaveValue(
    /sync_tenant_schema/
  );
  await expect(filtersForm.locator("input.form-control").nth(2)).toHaveValue(
    tenant.slug
  );
  await expect(filtersForm.locator("input.form-control").nth(3)).toHaveValue(
    errorCode
  );
});
