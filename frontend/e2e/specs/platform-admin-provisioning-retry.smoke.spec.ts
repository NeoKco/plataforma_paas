import { expect, test } from "../support/test";
import { seedFailedProvisioningJob } from "../support/backend-control";
import { loginPlatform } from "../support/auth";
import { buildE2ETenantIdentity } from "../support/e2e-data";
import { openCreateTenantForm } from "../support/platform-admin";

test("platform admin can requeue a failed provisioning job from provisioning", async ({
  page,
}) => {
  const tenant = buildE2ETenantIdentity("provisioning-retry");

  await loginPlatform(page);
  await page.goto("/tenants");
  await expect(page).toHaveURL(/\/tenants$/);

  const createForm = await openCreateTenantForm(page);
  await createForm
    .getByPlaceholder(/Ej: Empresa Centro|Ex: Empresa Centro/i)
    .fill(tenant.name);
  await createForm.getByPlaceholder("empresa-centro").fill(tenant.slug);
  await createForm
    .getByRole("button", { name: /Crear tenant|Create tenant/ })
    .click();

  await expect(
    page
      .locator(".tenant-action-feedback--success")
      .filter({ hasText: /Alta de tenant|Create tenant/i })
      .first()
  ).toContainText(/creado|created/i);

  const seededJob = seedFailedProvisioningJob({
    tenantSlug: tenant.slug,
    errorMessage: `E2E failed retry job ${tenant.id}`,
  });

  await page.goto("/provisioning");
  await expect(page).toHaveURL(/\/provisioning$/);
  await expect(
    page.getByRole("heading", { name: "Provisioning", exact: true })
  ).toBeVisible();

  const failedJobRow = page
    .locator("tr")
    .filter({ hasText: `#${seededJob.jobId}` })
    .filter({ has: page.getByRole("button", { name: /Reencolar|Requeue/i }) })
    .first();

  await expect
    .poll(async () => {
      return failedJobRow.count();
    })
    .toBeGreaterThan(0);

  await failedJobRow.getByRole("button", { name: /Reencolar|Requeue/i }).click();

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
  ).toContainText(/nuevo intento|queue for retry|returned to the queue/i);

  await expect(
    page
      .locator("tr")
      .filter({ hasText: `#${seededJob.jobId}` })
      .getByRole("button", { name: /Reencolar|Requeue/i })
  ).toHaveCount(0);
});