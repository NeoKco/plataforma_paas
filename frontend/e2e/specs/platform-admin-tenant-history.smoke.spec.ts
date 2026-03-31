import { expect, test } from "@playwright/test";
import { seedTenantBillingSyncEvent } from "../support/backend-control";
import { loginPlatform } from "../support/auth";

test("platform admin can review tenant history filters exports and detail", async ({ page }) => {
  const uniqueSuffix = Date.now();
  const tenantName = `E2E History ${uniqueSuffix}`;
  const tenantSlug = `e2e-history-${uniqueSuffix}`;
  const providerEventId = `evt_e2e_history_${uniqueSuffix}`;

  await loginPlatform(page);
  await page.goto("/tenants");
  await expect(page).toHaveURL(/\/tenants$/);
  await expect(
    page.locator("h1.page-title").filter({ hasText: /^Tenants$/i })
  ).toBeVisible();

  const createForm = page.locator("form.tenant-create-form").first();
  await createForm.getByPlaceholder(/Ej: Empresa Centro|Ex: Empresa Centro/i).fill(tenantName);
  await createForm.getByPlaceholder("empresa-centro").fill(tenantSlug);
  await createForm.getByRole("button", { name: /Crear tenant|Create tenant/i }).click();

  await expect(
    page
      .locator(".tenant-action-feedback--success")
      .filter({ hasText: /Alta de tenant|Create tenant/i })
      .first()
  ).toContainText(/creado|created/i);

  const seededEvent = seedTenantBillingSyncEvent({
    tenantSlug,
    providerEventId,
    billingStatusReason: `E2E tenant history ${uniqueSuffix}`,
    providerCustomerId: `cus_history_${uniqueSuffix}`,
    providerSubscriptionId: `sub_history_${uniqueSuffix}`,
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
    .fill(tenantSlug);
  await archivePanel.locator("select.form-select").nth(1).selectOption("past_due");
  await archivePanel.getByRole("button", { name: /Aplicar filtros|Apply filters/i }).click();

  const historyTable = page
    .locator(".data-table-card")
    .filter({ hasText: /Retirados recientes|Recent retirements/i })
    .first();

  const historyRow = historyTable.locator("table tbody tr").filter({ hasText: tenantSlug }).first();
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
    page.locator(".panel-card").filter({ hasText: new RegExp(`Detalle histórico: ${tenantName}|Historical detail: ${tenantName}`) }).first()
  ).toBeVisible();
  await expect(page.getByText(/Policy efectiva al retiro|Effective policy at retirement/i)).toBeVisible();
  await expect(page.getByRole("heading", { name: /Billing reciente|Recent billing/i })).toBeVisible();
  await expect(page.getByText("invoice.payment_failed", { exact: true })).toBeVisible();

  await historyRow.getByRole("button", { name: /Ocultar detalle|Hide detail/i }).click();
  await expect(
    page.locator(".panel-card").filter({ hasText: new RegExp(`Detalle histórico: ${tenantName}|Historical detail: ${tenantName}`) }).first()
  ).toHaveCount(0);
});