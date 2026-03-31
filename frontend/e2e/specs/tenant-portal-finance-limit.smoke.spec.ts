import { expect, test, type Page } from "@playwright/test";
import { loginPlatform, loginTenant } from "../support/auth";
import { e2eEnv } from "../support/env";
import {
  ensureFinanceTransactionFormReady,
  getFinanceTransactionForm,
  getTransactionRowByDescription,
  openFinanceTransactionsPage,
} from "../support/finance";

async function ensurePlatformTenantsPage(page: Page) {
  await page.goto("/tenants");
  if (/\/login($|[?#])/.test(page.url())) {
    await loginPlatform(page);
    await page.goto("/tenants");
  }

  await expect(page).toHaveURL(/\/tenants$/);
  await expect(
    page.getByRole("heading", { name: "Tenants", exact: true })
  ).toBeVisible();
}

async function selectTenant(page: Page, tenantSlug: string) {
  await ensurePlatformTenantsPage(page);
  await page.locator("input.form-control").first().fill(tenantSlug);

  const tenantListItem = page
    .locator("button.tenant-list__item")
    .filter({ hasText: tenantSlug })
    .first();

  await expect(tenantListItem).toBeVisible();
  await tenantListItem.click();
}

async function updateFinanceEntriesLimit(page: Page, tenantSlug: string, value: string) {
  await selectTenant(page, tenantSlug);

  const moduleLimitsForm = page
    .locator("form.tenant-action-form")
    .filter({
      has: page.getByRole("heading", { name: /Límites por módulo|Module limits/i }),
    })
    .first();

  const financeEntriesLimitRow = moduleLimitsForm
    .locator(".tenant-module-limit-row")
    .filter({ hasText: "finance.entries" })
    .first();

  await expect(financeEntriesLimitRow).toBeVisible();
  await financeEntriesLimitRow.locator('input[type="number"]').fill(value);
  await moduleLimitsForm
    .getByRole("button", { name: /Actualizar límites por módulo|Update module limits/i })
    .click();

  const confirmDialog = page.getByRole("dialog");
  await expect(confirmDialog).toBeVisible();
  await confirmDialog
    .getByRole("button", {
      name: /Actualizar límites por módulo|Update module limits/i,
    })
    .click();

  await expect(
    page
      .locator(".tenant-action-feedback--success")
      .filter({ hasText: /Límites por módulo|Module limits/i })
      .first()
  ).toContainText(/actualizados|updated/i);
}

test("tenant portal finance shows limit enforcement when entries quota is exhausted", async ({
  page,
}) => {
  const uniqueDescription = `e2e-finance-limit-${Date.now()}`;

  await loginPlatform(page);
  await updateFinanceEntriesLimit(page, e2eEnv.tenant.slug, "1");

  try {
    await loginTenant(page);
    await openFinanceTransactionsPage(page);

    await expect(page.getByText(/al límite|at limit/i).first()).toBeVisible();

    const form = getFinanceTransactionForm(page);
    await ensureFinanceTransactionFormReady(page, form, `e2e-finance-limit-account-${Date.now()}`);
    await form.locator('input[type="number"]').first().fill("12345");
    await form
      .getByPlaceholder(/Pago proveedor de mantención|Maintenance supplier payment/i)
      .fill(uniqueDescription);

    const createResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        /\/tenant\/finance\/transactions$/.test(response.url())
    );

    await form
      .getByRole("button", {
        name: /Registrar transacción|Create transaction/i,
      })
      .click();

    const createResponse = await createResponsePromise;
    expect(createResponse.status()).toBe(403);

    const responseBody = JSON.stringify(await createResponse.json());
    expect(responseBody).toMatch(/finance\.entries|límite|limit/i);

    const errorFeedback = page.locator(".tenant-action-feedback--error").first();
    if ((await page.locator(".tenant-action-feedback--error").count()) > 0) {
      await expect(errorFeedback).toContainText(/finance\.entries|límite|limit/i);
    }

    await expect(getTransactionRowByDescription(page, uniqueDescription)).toHaveCount(0);
  } finally {
    await updateFinanceEntriesLimit(page, e2eEnv.tenant.slug, "");
  }
});