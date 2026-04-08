import { expect, test } from "../support/test";
import { seedTenantBillingSyncEvent } from "../support/backend-control";
import { loginPlatform } from "../support/auth";
import { buildE2ETenantIdentity } from "../support/e2e-data";
import { fillCreateTenantForm, openCreateTenantForm } from "../support/platform-admin";

test("platform admin can review tenant history filters exports and detail", async ({ page }) => {
  const tenant = buildE2ETenantIdentity("history");
  const providerEventId = `evt_${tenant.id}`;

  await loginPlatform(page);
  await page.goto("/tenants");
  await expect(page).toHaveURL(/\/tenants$/);
  await expect(
    page.locator("h1.page-title").filter({ hasText: /^Tenants$/i })
  ).toBeVisible();

  const createForm = await openCreateTenantForm(page);
  await fillCreateTenantForm(createForm, tenant);
  await createForm.getByRole("button", { name: /Crear tenant|Create tenant/i }).click();

  await expect(
    page
      .locator(".tenant-action-feedback--success")
      .filter({ hasText: /Alta de tenant|Create tenant/i })
      .first()
  ).toContainText(/creado|created/i);

  const seededEvent = seedTenantBillingSyncEvent({
    tenantSlug: tenant.slug,
    providerEventId,
    billingStatusReason: `E2E tenant history ${tenant.id}`,
    providerCustomerId: `cus_history_${tenant.id}`,
    providerSubscriptionId: `sub_history_${tenant.id}`,
  });

  expect(seededEvent.processingResult).toBe("applied");

  await page.getByRole("button", { name: /Archivar tenant|Archive tenant/i }).click();

  let confirmDialog = page.getByRole("dialog");
  await expect(confirmDialog).toBeVisible();
  await confirmDialog.getByRole("button", { name: /Archivar tenant|Archive tenant/i }).click();

  await expect(
    page
      .locator(".tenant-action-feedback--success")
      .filter({ hasText: /Archivo de tenant|Archive tenant/i })
      .first()
  ).toContainText(/archivado|archived/i);

  await page.getByRole("button", { name: /Eliminar tenant|Delete tenant/i }).click();
  confirmDialog = page.getByRole("dialog");
  await expect(confirmDialog).toBeVisible();
  await confirmDialog.getByRole("button", { name: /Eliminar tenant|Delete tenant/i }).click();

  await page.goto("/tenant-history");
  await expect(page).toHaveURL(/\/tenant-history$/);
  await expect(
    page.locator("h1.page-title").filter({ hasText: /Histórico tenants|Tenant history/i })
  ).toBeVisible();

  const archivePanel = page
    .locator(".panel-card")
    .filter({ hasText: /Archivo histórico|Historical archive/i })
    .first();

  await archivePanel
    .getByPlaceholder(/Buscar por nombre, slug, actor o billing|Search by name, slug, actor or billing/i)
    .fill(tenant.slug);
  await archivePanel.locator("select.form-select").nth(1).selectOption("past_due");
  await archivePanel.getByRole("button", { name: /Aplicar filtros|Apply filters/i }).click();

  const historyTable = page
    .locator(".data-table-card")
    .filter({ hasText: /Retirados recientes|Recent retirements/i })
    .first();

  const historyRow = historyTable.locator("table tbody tr").filter({ hasText: tenant.slug }).first();
  await expect(historyRow).toBeVisible();
  await expect(historyRow).toContainText(/past due|con deuda/i);
  await expect(historyRow).toContainText(/1 billing/i);

  await expect(page.getByRole("button", { name: /Exportar CSV|Export CSV/i })).toBeEnabled();
  await expect(page.getByRole("button", { name: /Exportar JSON|Export JSON/i })).toBeEnabled();

  const [csvDownload] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: /Exportar CSV|Export CSV/i }).click(),
  ]);
  expect(await csvDownload.suggestedFilename()).toBe("tenant-retirement-archives.csv");

  const [jsonDownload] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: /Exportar JSON|Export JSON/i }).click(),
  ]);
  expect(await jsonDownload.suggestedFilename()).toBe("tenant-retirement-archives.json");

  await historyRow.getByRole("button", { name: /Ver detalle|View detail/i }).click();

  await expect(
    page
      .locator(".panel-card")
      .filter({ hasText: new RegExp(`Detalle histórico: ${tenant.name}|Historical detail: ${tenant.name}`) })
      .first()
  ).toBeVisible();
  await expect(page.getByText(/Policy efectiva al retiro|Effective policy at retirement/i)).toBeVisible();
  await expect(page.getByRole("heading", { name: /Billing reciente|Recent billing/i })).toBeVisible();
  await expect(page.getByText("invoice.payment_failed", { exact: true })).toBeVisible();

  await historyRow.getByRole("button", { name: /Ocultar detalle|Hide detail/i }).click();
  await expect(
    page
      .locator(".panel-card")
      .filter({ hasText: new RegExp(`Detalle histórico: ${tenant.name}|Historical detail: ${tenant.name}`) })
      .first()
  ).toHaveCount(0);
});
