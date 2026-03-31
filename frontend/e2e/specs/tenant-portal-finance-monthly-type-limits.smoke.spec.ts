import { expect, test, type Page } from "@playwright/test";
import {
  getTenantFinanceUsageSnapshot,
  setTenantModuleLimit,
} from "../support/backend-control";
import { e2eEnv } from "../support/env";
import {
  createBasicExpenseTransaction,
  createBasicIncomeTransaction,
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
    const tenantSlugInput = page.locator('input[autocomplete="organization"]');
    const tenantEmailInput = page.locator('input[autocomplete="email"]');
    const tenantPasswordInput = page.locator('input[autocomplete="current-password"]');

    await expect(tenantSlugInput).toHaveValue(e2eEnv.tenant.slug);
    await expect(tenantEmailInput).toHaveValue(e2eEnv.tenant.email);
    await tenantPasswordInput.fill(e2eEnv.tenant.password);
    await page.getByRole("button", { name: /Ingresar|Login/ }).click();
    await page.waitForLoadState("networkidle");

    if (/\/tenant-portal\/login/.test(page.url())) {
      throw new Error(
        `Tenant login did not advance for slug=${e2eEnv.tenant.slug} email=${e2eEnv.tenant.email}`
      );
    }

    await expect(page).toHaveURL(/\/tenant-portal($|[/?#])/);
    return;
  }

  await expect(page).toHaveURL(/\/tenant-portal($|[/?#])/);
}

async function expectBlockedTypeTransaction(
  page: Page,
  options: {
    transactionType: "income" | "expense";
    blockedDescription: string;
    moduleKey: "finance.entries.monthly.income" | "finance.entries.monthly.expense";
  }
) {
  const form = getFinanceTransactionForm(page);
  await ensureFinanceTransactionFormReady(
    page,
    form,
    `e2e-finance-monthly-type-account-${Date.now()}`
  );
  await form.getByRole("combobox").first().selectOption(options.transactionType);
  await form.locator('input[type="number"]').first().fill("12345");
  await form
    .getByPlaceholder(/Pago proveedor de mantención|Maintenance supplier payment/i)
    .fill(options.blockedDescription);

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
  expect(responseBody).toMatch(new RegExp(`${options.moduleKey.replace(/\./g, "\\.")}|límite|limit`, "i"));

  const errorFeedback = page.locator(".tenant-action-feedback--error").first();
  if ((await page.locator(".tenant-action-feedback--error").count()) > 0) {
    await expect(errorFeedback).toContainText(
      new RegExp(`${options.moduleKey.replace(/\./g, "\\.")}|límite|limit`, "i")
    );
  }

  await expect(getTransactionRowByDescription(page, options.blockedDescription)).toHaveCount(0);
}

test("tenant portal finance blocks income creation when monthly income quota is exhausted", async ({
  page,
}) => {
  const seedDescription = `e2e-finance-income-seed-${Date.now()}`;
  const blockedDescription = `e2e-finance-income-blocked-${Date.now()}`;

  setTenantModuleLimit({
    tenantSlug: e2eEnv.tenant.slug,
    moduleKey: "finance.entries.monthly.income",
    value: null,
  });

  await ensureTenantPortalSession(page);
  await openFinanceTransactionsPage(page);
  await createBasicIncomeTransaction(page, seedDescription);

  const usageAfterSeed = getTenantFinanceUsageSnapshot(e2eEnv.tenant.slug);
  expect(usageAfterSeed.monthlyIncomeEntries).toBeGreaterThan(0);

  const appliedLimit = setTenantModuleLimit({
    tenantSlug: e2eEnv.tenant.slug,
    moduleKey: "finance.entries.monthly.income",
    value: usageAfterSeed.monthlyIncomeEntries,
  });
  expect(appliedLimit.moduleLimits["finance.entries.monthly.income"]).toBe(
    usageAfterSeed.monthlyIncomeEntries
  );

  try {
    await ensureTenantPortalSession(page);
    await openFinanceTransactionsPage(page);
    await expectBlockedTypeTransaction(page, {
      transactionType: "income",
      blockedDescription,
      moduleKey: "finance.entries.monthly.income",
    });
  } finally {
    const clearedLimit = setTenantModuleLimit({
      tenantSlug: e2eEnv.tenant.slug,
      moduleKey: "finance.entries.monthly.income",
      value: null,
    });
    expect(clearedLimit.moduleLimits["finance.entries.monthly.income"]).toBeUndefined();
  }
});

test("tenant portal finance blocks expense creation when monthly expense quota is exhausted", async ({
  page,
}) => {
  const seedDescription = `e2e-finance-expense-seed-${Date.now()}`;
  const blockedDescription = `e2e-finance-expense-blocked-${Date.now()}`;

  setTenantModuleLimit({
    tenantSlug: e2eEnv.tenant.slug,
    moduleKey: "finance.entries.monthly.expense",
    value: null,
  });

  await ensureTenantPortalSession(page);
  await openFinanceTransactionsPage(page);
  await createBasicExpenseTransaction(page, seedDescription);

  const usageAfterSeed = getTenantFinanceUsageSnapshot(e2eEnv.tenant.slug);
  expect(usageAfterSeed.monthlyExpenseEntries).toBeGreaterThan(0);

  const appliedLimit = setTenantModuleLimit({
    tenantSlug: e2eEnv.tenant.slug,
    moduleKey: "finance.entries.monthly.expense",
    value: usageAfterSeed.monthlyExpenseEntries,
  });
  expect(appliedLimit.moduleLimits["finance.entries.monthly.expense"]).toBe(
    usageAfterSeed.monthlyExpenseEntries
  );

  try {
    await ensureTenantPortalSession(page);
    await openFinanceTransactionsPage(page);
    await expectBlockedTypeTransaction(page, {
      transactionType: "expense",
      blockedDescription,
      moduleKey: "finance.entries.monthly.expense",
    });
  } finally {
    const clearedLimit = setTenantModuleLimit({
      tenantSlug: e2eEnv.tenant.slug,
      moduleKey: "finance.entries.monthly.expense",
      value: null,
    });
    expect(clearedLimit.moduleLimits["finance.entries.monthly.expense"]).toBeUndefined();
  }
});
