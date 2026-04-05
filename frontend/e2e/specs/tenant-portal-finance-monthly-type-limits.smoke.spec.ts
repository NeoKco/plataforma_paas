import { expect, test, type Page } from "../support/test";
import { loginTenant } from "../support/auth";
import {
  getTenantFinanceUsageSnapshot,
  setTenantModuleLimit,
} from "../support/backend-control";
import { buildE2EText } from "../support/e2e-data";
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

  await page.goto("/tenant-portal/finance");
  await page.waitForLoadState("networkidle");

  if (/\/tenant-portal\/login($|[?#])/.test(page.url())) {
    await loginTenant(page);
    return;
  }

  await expect(page).toHaveURL(/\/tenant-portal\/finance($|[/?#])/);
}

async function expectBlockedTypeTransaction(
  page: Page,
  options: {
    transactionType: "income" | "expense";
    blockedDescription: string;
    moduleKey: "finance.entries.monthly.income" | "finance.entries.monthly.expense";
    accountName: string;
  }
) {
  let form = getFinanceTransactionForm(page);
  form = await ensureFinanceTransactionFormReady(page, form, options.accountName);
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
  const seedDescription = buildE2EText("finance-monthly-income-seed", "e2e-finance-income-seed");
  const blockedDescription = buildE2EText(
    "finance-monthly-income-blocked",
    "e2e-finance-income-blocked"
  );
  const accountName = buildE2EText(
    "finance-monthly-income-account",
    "e2e-finance-monthly-type-account"
  );

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
      accountName,
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
  const seedDescription = buildE2EText("finance-monthly-expense-seed", "e2e-finance-expense-seed");
  const blockedDescription = buildE2EText(
    "finance-monthly-expense-blocked",
    "e2e-finance-expense-blocked"
  );
  const accountName = buildE2EText(
    "finance-monthly-expense-account",
    "e2e-finance-monthly-type-account"
  );

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
      accountName,
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
