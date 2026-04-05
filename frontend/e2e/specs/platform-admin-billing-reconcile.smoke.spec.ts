import { expect, test } from "../support/test";
import { seedTenantBillingSyncEvent } from "../support/backend-control";
import { loginPlatform } from "../support/auth";
import { openCreateTenantForm } from "../support/platform-admin";

test("platform admin can review and reconcile a tenant billing event", async ({ page }) => {
  const uniqueSuffix = Date.now();
  const tenantName = `E2E Billing ${uniqueSuffix}`;
  const tenantSlug = `e2e-billing-${uniqueSuffix}`;
  const providerEventId = `evt_e2e_billing_${uniqueSuffix}`;
  const currentPeriodEndsAtIso = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const graceUntilIso = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

  await loginPlatform(page);
  await page.goto("/tenants");
  await expect(page).toHaveURL(/\/tenants$/);
  await expect(
    page.locator("h1.page-title").filter({ hasText: /^Tenants$/i })
  ).toBeVisible();

  const createForm = await openCreateTenantForm(page);
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
    billingStatusReason: `E2E billing past due ${uniqueSuffix}`,
    billingCurrentPeriodEndsAtIso: currentPeriodEndsAtIso,
    billingGraceUntilIso: graceUntilIso,
    providerCustomerId: `cus_e2e_${uniqueSuffix}`,
    providerSubscriptionId: `sub_e2e_${uniqueSuffix}`,
  });

  expect(seededEvent.processingResult).toBe("applied");

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

  await tenantSelect.selectOption(String(seededEvent.tenantId));
  await providerSelect.selectOption("stripe");
  await eventTypeInput.fill("invoice.payment_failed");
  await billingFilters.getByRole("button", { name: /Aplicar filtros|Apply filters/i }).click();

  await expect(
    page
      .locator("table tbody tr")
      .filter({ has: page.getByText("stripe", { exact: true }) })
      .filter({ has: page.getByText("invoice.payment_failed", { exact: true }) })
      .first()
  ).toBeVisible();

  await expect(
    page.getByRole("heading", {
      name: new RegExp(`Espacio tenant de billing: ${tenantName}|Tenant billing workspace: ${tenantName}`),
    })
  ).toBeVisible();
  await expect(page.getByText(tenantSlug, { exact: true })).toBeVisible();
  await expect(page.getByText(/con deuda|past due/i).first()).toBeVisible();

  const tenantEventsTable = page
    .locator(".panel-card, .data-table-card")
    .filter({ hasText: /Eventos billing tenant|Tenant billing events/i })
    .first();

  await expect(tenantEventsTable.getByText("invoice.payment_failed", { exact: true })).toBeVisible();
  await expect(tenantEventsTable.getByText(/applied/i).first()).toBeVisible();

  await tenantEventsTable.getByRole("button", { name: /Reconciliar|Reconcile/i }).first().click();

  const confirmDialog = page.getByRole("dialog");
  await expect(confirmDialog).toBeVisible();
  await expect(
    confirmDialog.getByRole("heading", {
      name: new RegExp(`Reconciliar evento #${seededEvent.syncEventId}|Reconcile event #${seededEvent.syncEventId}`),
    })
  ).toBeVisible();
  await confirmDialog.getByRole("button", { name: /Reconciliar evento|Reconcile event/i }).click();

  await expect(
    page
      .locator(".tenant-action-feedback--success")
      .filter({ hasText: /Reconcile de evento|Event reconcile/i })
      .first()
  ).toContainText(/reconciliado correctamente|reconciled successfully/i);

  await expect.poll(async () => {
    return tenantEventsTable.getByText(/reconciliado|reconciled/i).count();
  }).toBeGreaterThan(0);
});