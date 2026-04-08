import { expect, test } from "../support/test";
import { seedTenantBillingSyncEvent } from "../support/backend-control";
import { loginPlatform } from "../support/auth";
import { buildE2ETenantIdentity } from "../support/e2e-data";
import { fillCreateTenantForm, openCreateTenantForm } from "../support/platform-admin";

test("platform admin can batch reconcile filtered tenant billing events", async ({ page }) => {
  const tenant = buildE2ETenantIdentity("billing-batch");
  const eventType = "invoice.payment_failed";

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

  const firstEvent = seedTenantBillingSyncEvent({
    tenantSlug: tenant.slug,
    providerEventId: `evt_${tenant.id}_a`,
    eventType,
    billingStatusReason: `E2E batch billing A ${tenant.id}`,
    providerCustomerId: `cus_batch_${tenant.id}`,
    providerSubscriptionId: `sub_batch_${tenant.id}`,
  });
  const secondEvent = seedTenantBillingSyncEvent({
    tenantSlug: tenant.slug,
    providerEventId: `evt_${tenant.id}_b`,
    eventType,
    billingStatusReason: `E2E batch billing B ${tenant.id}`,
    providerCustomerId: `cus_batch_${tenant.id}`,
    providerSubscriptionId: `sub_batch_${tenant.id}`,
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

  await expect.poll(async () => {
    return tenantEventsCard.getByText(/reconciliado|reconciled/i).count();
  }).toBeGreaterThanOrEqual(2);
});
