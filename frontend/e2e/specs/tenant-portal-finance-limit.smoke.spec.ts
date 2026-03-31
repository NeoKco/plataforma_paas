import { expect, test, type Page } from "@playwright/test";
import { loginPlatform, loginTenant } from "../support/auth";
import { e2eEnv } from "../support/env";
import {
  createBasicExpenseTransaction,
  ensureFinanceTransactionFormReady,
  getFinanceTransactionForm,
  getTransactionRowByDescription,
  openFinanceTransactionsPage,
} from "../support/finance";

async function getUsageValue(page: Page, label: RegExp) {
  const field = page
    .locator(".tenant-detail__label")
    .filter({ hasText: label })
    .first()
    .locator("xpath=..");

  await expect(field).toBeVisible();
  return (await field.locator(".tenant-detail__value").innerText()).trim();
}

async function getUsedEntries(page: Page) {
  const usedText = await getUsageValue(page, /Usado|Used/i);
  const usedEntries = Number.parseInt(usedText, 10);

  if (Number.isNaN(usedEntries)) {
    throw new Error(`Could not parse finance used entries from: ${usedText}`);
  }

  return usedEntries;
}

async function ensureTenantPortalSession(page: Page, options?: { forceFreshLogin?: boolean }) {
  if (options?.forceFreshLogin) {
    await page.goto("/");
    await page.evaluate(() => {
      window.sessionStorage.removeItem("platform_paas.tenant_session");
    });
  }

  const searchParams = new URLSearchParams({
    tenantSlug: e2eEnv.tenant.slug,
    email: e2eEnv.tenant.email,
  });

  await page.goto(`/tenant-portal/login?${searchParams.toString()}`);
  await page.waitForLoadState("networkidle");

  if (/\/tenant-portal\/login($|[?#])/.test(page.url())) {
    await loginTenant(page);
    return;
  }

  await expect(page).toHaveURL(/\/tenant-portal($|[/?#])/);
}

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
  const seedDescription = `e2e-finance-seed-${Date.now()}`;
  const uniqueDescription = `e2e-finance-limit-${Date.now()}`;

  await loginPlatform(page);
  await updateFinanceEntriesLimit(page, e2eEnv.tenant.slug, "");

  await ensureTenantPortalSession(page);
  await openFinanceTransactionsPage(page);

  const usedEntriesBefore = await getUsedEntries(page);
  await createBasicExpenseTransaction(page, seedDescription);
  const exhaustedLimit = String(usedEntriesBefore + 1);

  await updateFinanceEntriesLimit(page, e2eEnv.tenant.slug, exhaustedLimit);

  try {
    await ensureTenantPortalSession(page, { forceFreshLogin: true });
    await openFinanceTransactionsPage(page);

    await expect
      .poll(async () => getUsageValue(page, /Estado|Status/i))
      .toMatch(/al límite|at limit/i);
    await expect
      .poll(async () => getUsageValue(page, /Límite|Limit/i))
      .toBe(exhaustedLimit);
    await expect
      .poll(async () => String(await getUsedEntries(page)))
      .toBe(exhaustedLimit);

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