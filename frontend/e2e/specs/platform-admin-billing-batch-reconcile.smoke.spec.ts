import { expect, test } from "@playwright/test";
import { seedTenantBillingSyncEvent } from "../support/backend-control";
import { loginPlatform } from "../support/auth";

test("platform admin can batch reconcile filtered tenant billing events", async ({ page }) => {
  const uniqueSuffix = Date.now();
  const tenantName = `E2E Billing Batch ${uniqueSuffix}`;
  const tenantSlug = `e2e-billing-batch-${uniqueSuffix}`;
  const eventType = "invoice.payment_failed";

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

  const firstEvent = seedTenantBillingSyncEvent({
    tenantSlug,
    providerEventId: `evt_e2e_billing_batch_a_${uniqueSuffix}`,
    eventType,
    billingStatusReason: `E2E batch billing A ${uniqueSuffix}`,
    providerCustomerId: `cus_batch_${uniqueSuffix}`,
    providerSubscriptionId: `sub_batch_${uniqueSuffix}`,
  });
  const secondEvent = seedTenantBillingSyncEvent({
    tenantSlug,
    providerEventId: `evt_e2e_billing_batch_b_${uniqueSuffix}`,
    eventType,
    billingStatusReason: `E2E batch billing B ${uniqueSuffix}`,
    providerCustomerId: `cus_batch_${uniqueSuffix}`,
    providerSubscriptionId: `sub_batch_${uniqueSuffix}`,
  });

  expect(firstEvent.processingResult).toBe("applied");
  expect(secondEvent.processingResult).toBe("applied");

  await page.goto("/billing");
  await expect(page).toHaveURL(/\/billing$/);
  await expect(
    page.locator("h1.page-title").filter({ hasText: /Facturación|Billing/i })
  ).toBeVisible();

  const billingFilters = page
    .locator(".panel-card")
    .filter({ hasText: /Filtros de facturación|Billing filters/i })
    .first();

  const tenantSelect = billingFilters.locator("select.form-select").nth(0);
  const providerSelect = billingFilters.locator("select.form-select").nth(1);
  const eventTypeInput = billingFilters.locator("input.form-control").nth(0);

  await tenantSelect.selectOption(String(firstEvent.tenantId));
  await providerSelect.selectOption("stripe");
  await eventTypeInput.fill(eventType);
  await billingFilters.getByRole("button", { name: /Aplicar filtros|Apply filters/i }).click();

  const tenantEventsCard = page
    .locator(".panel-card, .data-table-card")
    .filter({ hasText: /Eventos billing tenant|Tenant billing events/i })
    .first();

  await expect.poll(async () => {
    return tenantEventsCard.locator("table tbody tr").count();
  }).toBeGreaterThanOrEqual(2);

  await expect(tenantEventsCard.getByText(/applied/i)).toHaveCount(2);

  const batchForm = page.locator("form.tenant-action-form").filter({
    has: page.getByRole("heading", { name: /Reconcile en lote|Batch reconcile/i }),
  }).first();

  await batchForm.getByRole("spinbutton").fill("2");
  await batchForm.getByRole("button", { name: /Reconciliar eventos filtrados|Reconcile filtered events/i }).click();

  const confirmDialog = page.getByRole("dialog");
  await expect(confirmDialog).toBeVisible();
  await expect(
    confirmDialog.getByRole("heading", {
      name: /Reconciliar eventos filtrados|Reconcile filtered events/i,
    })
  ).toBeVisible();
  await confirmDialog.getByRole("button", { name: /Reconciliar lote|Reconcile batch/i }).click();

  await expect(
    page
      .locator(".tenant-action-feedback--success")
      .filter({ hasText: /Reconcile en lote|Batch reconcile/i })
      .first()
  ).toContainText(/reconciliados correctamente|reconciled successfully/i);

  await expect.poll(async () => {
    return tenantEventsCard.getByText(/reconciliado|reconciled/i).count();
  }).toBeGreaterThanOrEqual(2);
});