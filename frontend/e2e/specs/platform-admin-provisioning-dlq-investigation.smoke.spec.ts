import { expect, test } from "../support/test";
import {
  seedFailedProvisioningJob,
  seedPlatformTenantCatalogRecord,
} from "../support/backend-control";
import { loginPlatform } from "../support/auth";
import { buildE2ETenantIdentity } from "../support/e2e-data";

test("platform admin can prefill DLQ investigation from failures by code", async ({
  page,
}) => {
  const tenant = buildE2ETenantIdentity("provisioning-dlq-investigation");
  const errorCode = `e2e-dlq-investigation-${tenant.id}`;

  seedPlatformTenantCatalogRecord({
    name: tenant.name,
    slug: tenant.slug,
    adminFullName: tenant.adminFullName,
    adminEmail: tenant.adminEmail,
    adminPassword: tenant.adminPassword,
  });

  await loginPlatform(page);

  seedFailedProvisioningJob({
    tenantSlug: tenant.slug,
    errorCode,
    errorMessage: `E2E investigate DLQ ${tenant.id}`,
  });

  await page.goto("/provisioning");
  await expect(page).toHaveURL(/\/provisioning$/);
  await expect(
    page.getByRole("heading", { name: "Provisioning", exact: true })
  ).toBeVisible();

  const failureTable = page.locator(".panel-card.data-table-card").filter({
    has: page.getByRole("heading", { name: /Fallos por código|Failures by code/i }),
  });

  const failureRow = failureTable
    .locator("tr")
    .filter({ hasText: tenant.slug })
    .filter({ hasText: errorCode })
    .first();

  await expect.poll(async () => failureRow.count()).toBeGreaterThan(0);

  await failureRow
    .getByRole("button", { name: /Investigar en DLQ|Investigate in DLQ/i })
    .click();

  await expect(
    page
      .locator(".tenant-action-feedback--success")
      .filter({ hasText: /Investigación DLQ|DLQ investigation/i })
      .first()
  ).toContainText(/DLQ/i);

  const filtersForm = page.locator("form.tenant-action-form").filter({
    has: page.getByText(/Filtros DLQ|DLQ filters/i),
  });
  await expect(filtersForm.locator("input.form-control").nth(2)).toHaveValue(
    tenant.slug
  );
  await expect(filtersForm.locator("input.form-control").nth(3)).toHaveValue(
    errorCode
  );
});
