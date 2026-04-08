import { expect, test } from "../support/test";
import { seedTenantBillingSyncEvent } from "../support/backend-control";
import { loginPlatform } from "../support/auth";
import { buildE2ETenantIdentity } from "../support/e2e-data";
import { fillCreateTenantForm, openCreateTenantForm } from "../support/platform-admin";

test("platform admin can review and reconcile a tenant billing event", async ({ page }) => {
  const tenant = buildE2ETenantIdentity("billing");
  const providerEventId = `evt_${tenant.id}`;
  const currentPeriodEndsAtIso = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const graceUntilIso = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

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
    billingStatusReason: `E2E billing past due ${tenant.id}`,
    billingCurrentPeriodEndsAtIso: currentPeriodEndsAtIso,
    billingGraceUntilIso: graceUntilIso,
    providerCustomerId: `cus_${tenant.id}`,
    providerSubscriptionId: `sub_${tenant.id}`,
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
      name: new RegExp(`Espacio tenant de billing: ${tenant.name}|Tenant billing workspace: ${tenant.name}`),
    })
  ).toBeVisible();
  await expect(page.getByText(tenant.slug, { exact: true })).toBeVisible();
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
