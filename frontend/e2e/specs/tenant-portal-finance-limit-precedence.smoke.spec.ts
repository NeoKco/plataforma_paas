import { expect, test, type Page } from "../support/test";
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

async function ensureTenantPortalSession(page: Page) {
  await page.goto("/tenant-portal/finance");
  await page.waitForLoadState("networkidle");

  if (/\/tenant-portal\/login($|[?#])/.test(page.url())) {
    await loginTenant(page);
    await openFinanceTransactionsPage(page);
    return;
  }

  await expect(page).toHaveURL(/\/tenant-portal\/finance($|[/?#])/);
}

test("tenant portal finance prioritizes total limit when total and monthly quotas are both exhausted", async ({
  page,
}) => {
  const seedDescription = `e2e-finance-precedence-seed-${Date.now()}`;
  const blockedDescription = `e2e-finance-precedence-blocked-${Date.now()}`;

  setTenantModuleLimit({
    tenantSlug: e2eEnv.tenant.slug,
    moduleKey: "finance.entries",
    value: null,
  });
  setTenantModuleLimit({
    tenantSlug: e2eEnv.tenant.slug,
    moduleKey: "finance.entries.monthly",
    value: null,
  });

  await ensureTenantPortalSession(page);
  await openFinanceTransactionsPage(page);
  await createBasicExpenseTransaction(page, seedDescription);

  const usageAfterSeed = getTenantFinanceUsageSnapshot(e2eEnv.tenant.slug);
  expect(usageAfterSeed.totalEntries).toBeGreaterThan(0);
  expect(usageAfterSeed.monthlyEntries).toBeGreaterThan(0);

  const appliedTotal = setTenantModuleLimit({
    tenantSlug: e2eEnv.tenant.slug,
    moduleKey: "finance.entries",
    value: usageAfterSeed.totalEntries,
  });
  const appliedMonthly = setTenantModuleLimit({
    tenantSlug: e2eEnv.tenant.slug,
    moduleKey: "finance.entries.monthly",
    value: usageAfterSeed.monthlyEntries,
  });
  expect(appliedTotal.moduleLimits["finance.entries"]).toBe(usageAfterSeed.totalEntries);
  expect(appliedMonthly.moduleLimits["finance.entries.monthly"]).toBe(
    usageAfterSeed.monthlyEntries
  );

  try {
    await ensureTenantPortalSession(page);
    await openFinanceTransactionsPage(page);

    await expect.poll(async () => getUsageValue(page, /Estado|Status/i)).toMatch(/al límite|at limit/i);
    await expect.poll(async () => getUsageValue(page, /Límite|Limit/i)).toBe(String(usageAfterSeed.totalEntries));
    await expect.poll(async () => String(await getUsedEntries(page))).toBe(
      String(usageAfterSeed.totalEntries)
    );

    let form = getFinanceTransactionForm(page);
    form = await ensureFinanceTransactionFormReady(
      page,
      form,
      `e2e-finance-precedence-account-${Date.now()}`
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
    expect(responseBody).toContain("finance.entries");
    expect(responseBody).not.toContain("finance.entries.monthly");

    const errorFeedback = page.locator(".tenant-action-feedback--error").first();
    if ((await page.locator(".tenant-action-feedback--error").count()) > 0) {
      await expect(errorFeedback).toContainText(/finance\.entries|límite|limit/i);
      await expect(errorFeedback).not.toContainText(/finance\.entries\.monthly/i);
    }

    await expect(getTransactionRowByDescription(page, blockedDescription)).toHaveCount(0);
  } finally {
    const clearedTotal = setTenantModuleLimit({
      tenantSlug: e2eEnv.tenant.slug,
      moduleKey: "finance.entries",
      value: null,
    });
    const clearedMonthly = setTenantModuleLimit({
      tenantSlug: e2eEnv.tenant.slug,
      moduleKey: "finance.entries.monthly",
      value: null,
    });
    expect(clearedTotal.moduleLimits["finance.entries"]).toBeUndefined();
    expect(clearedMonthly.moduleLimits["finance.entries.monthly"]).toBeUndefined();
  }
});
