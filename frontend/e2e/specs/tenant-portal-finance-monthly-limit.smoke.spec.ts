import { expect, test, type Page } from "@playwright/test";
import { loginTenant } from "../support/auth";
import {
  getTenantFinanceUsageSnapshot,
  setTenantModuleLimit,
} from "../support/backend-control";
import { e2eEnv } from "../support/env";
import {
  createBasicExpenseTransaction,
  ensureFinanceTransactionFormReady,
  getFinanceTransactionForm,
  getTransactionRowByDescription,
  openFinanceTransactionsPage,
} from "../support/finance";

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

test("tenant portal finance blocks creation when monthly entries quota is exhausted", async ({
  page,
}) => {
  const seedDescription = `e2e-finance-monthly-seed-${Date.now()}`;
  const blockedDescription = `e2e-finance-monthly-blocked-${Date.now()}`;

  setTenantModuleLimit({
    tenantSlug: e2eEnv.tenant.slug,
    moduleKey: "finance.entries.monthly",
    value: null,
  });

  await ensureTenantPortalSession(page);
  await openFinanceTransactionsPage(page);
  await createBasicExpenseTransaction(page, seedDescription);

  const usageAfterSeed = getTenantFinanceUsageSnapshot(e2eEnv.tenant.slug);
  expect(usageAfterSeed.monthlyEntries).toBeGreaterThan(0);

  const appliedLimit = setTenantModuleLimit({
    tenantSlug: e2eEnv.tenant.slug,
    moduleKey: "finance.entries.monthly",
    value: usageAfterSeed.monthlyEntries,
  });
  expect(appliedLimit.moduleLimits["finance.entries.monthly"]).toBe(
    usageAfterSeed.monthlyEntries
  );

  try {
    await ensureTenantPortalSession(page, { forceFreshLogin: true });
    await openFinanceTransactionsPage(page);

    const form = getFinanceTransactionForm(page);
    await ensureFinanceTransactionFormReady(
      page,
      form,
      `e2e-finance-monthly-account-${Date.now()}`
    );
    await form.locator('input[type="number"]').first().fill("12345");
    await form
      .getByPlaceholder(/Pago proveedor de mantención|Maintenance supplier payment/i)
      .fill(blockedDescription);

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
    expect(responseBody).toMatch(/finance\.entries\.monthly|límite|limit/i);

    const errorFeedback = page.locator(".tenant-action-feedback--error").first();
    if ((await page.locator(".tenant-action-feedback--error").count()) > 0) {
      await expect(errorFeedback).toContainText(
        /finance\.entries\.monthly|límite|limit/i
      );
    }

    await expect(getTransactionRowByDescription(page, blockedDescription)).toHaveCount(0);
  } finally {
    const clearedLimit = setTenantModuleLimit({
      tenantSlug: e2eEnv.tenant.slug,
      moduleKey: "finance.entries.monthly",
      value: null,
    });
    expect(clearedLimit.moduleLimits["finance.entries.monthly"]).toBeUndefined();
  }
});
