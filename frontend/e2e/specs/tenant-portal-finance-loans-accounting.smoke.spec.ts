import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";
import { loginTenant } from "../support/auth";

function buildTodayDateValue() {
  return new Date().toISOString().slice(0, 10);
}

function buildFutureDateValue(days: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

async function ensureFinanceLoansPage(page: Page) {
  await page.goto("/tenant-portal/finance/loans");
  await page.waitForLoadState("networkidle");

  if (/\/tenant-portal\/login($|[?#])/.test(page.url())) {
    await loginTenant(page);
    await page.goto("/tenant-portal/finance/loans");
    await page.waitForLoadState("networkidle");
  }

  await expect(page).toHaveURL(/\/tenant-portal\/finance\/loans($|[/?#])/);
  await expect(page.getByRole("heading", { name: /Préstamos|Loans/i })).toBeVisible();
}

function getLoanFeedback(page: Page) {
  return page.locator(".tenant-action-feedback--success").first();
}

function getLoanRow(page: Page, name: string) {
  return page.locator("tbody tr").filter({ hasText: name }).first();
}

function getSchedulePanel(page: Page) {
  return page
    .locator(".panel-card")
    .filter({ has: page.getByText(/Cronograma del préstamo|Loan schedule/i) })
    .first();
}

function getDerivedAccountingSection(page: Page) {
  return getSchedulePanel(page)
    .locator(".d-grid.gap-3")
    .filter({ has: page.getByText(/Lectura contable derivada|Derived accounting reading/i) })
    .first();
}

async function openLoanSchedule(page: Page, loanName: string) {
  const loanRow = getLoanRow(page, loanName);
  await expect(loanRow).toBeVisible();

  const scheduleButton = loanRow.getByRole("button", { name: /Cronograma|Schedule/i });
  const hideButton = loanRow.getByRole("button", { name: /Ocultar|Hide/i });

  if (await scheduleButton.count()) {
    await scheduleButton.click();
  } else {
    await expect(hideButton).toBeVisible();
  }

  await expect(getSchedulePanel(page).getByText(loanName, { exact: true })).toBeVisible();
}

async function createLoan(page: Page, loanName: string) {
  await ensureFinanceLoansPage(page);

  const createForm = page.locator("form").first();
  const accountSelect = createForm.locator("select.form-select").nth(2);
  const accountOptions = await accountSelect.locator("option").evaluateAll((options) =>
    options
      .map((option) => ({
        value: (option as HTMLOptionElement).value,
        text: option.textContent?.trim() || "",
      }))
      .filter((option) => option.value !== "")
  );

  await createForm.locator("input.form-control").nth(0).fill(loanName);
  await createForm.locator("input.form-control").nth(1).fill("Banco Accounting E2E");

  if (accountOptions.length > 0) {
    await accountSelect.selectOption(accountOptions[0].value);
  }

  await createForm.locator('input[type="number"]').nth(0).fill("900");
  await createForm.locator('input[type="number"]').nth(1).fill("900");
  await createForm.locator('input[type="number"]').nth(2).fill("12");
  await createForm.locator('input[type="number"]').nth(3).fill("3");
  await createForm.locator('input[type="date"]').nth(0).fill(buildTodayDateValue());
  await createForm.locator('input[type="date"]').nth(1).fill(buildFutureDateValue(90));
  await createForm.locator("textarea.form-control").fill("Préstamo contable creado por smoke E2E");

  await createForm.getByRole("button", { name: /Registrar préstamo|Create loan/i }).click();

  await expect(getLoanFeedback(page)).toContainText(/pr[eé]stamo|loan/i);
  await expect(getLoanRow(page, loanName)).toBeVisible();
}

test("tenant portal finance loans exports derived accounting after payment and reversal", async ({
  page,
}) => {
  const loanName = `e2e-loan-accounting-${Date.now()}`;
  const paymentNote = `Payment note ${Date.now()}`;
  const reversalNote = `Reversal note ${Date.now()}`;

  await createLoan(page, loanName);
  await openLoanSchedule(page, loanName);

  const scheduleTable = getSchedulePanel(page).locator("table").first();
  const firstInstallmentRow = scheduleTable.locator("tbody tr").first();
  await expect(firstInstallmentRow).toBeVisible();

  await firstInstallmentRow.getByRole("button", { name: /Registrar pago|Record payment/i }).click();

  const paymentForm = page
    .locator("form")
    .filter({ has: page.getByRole("button", { name: /^(Aplicar pago|Apply payment)$/i }) })
    .first();
  await paymentForm.locator('input[type="number"]').first().fill("300");
  await paymentForm.locator("input.form-control").last().fill(paymentNote);
  await paymentForm.getByRole("button", { name: /Aplicar pago|Apply payment/i }).click();

  await expect(getLoanFeedback(page)).toContainText(/pago|payment/i);
  await expect(firstInstallmentRow).toContainText(/300/);
  await firstInstallmentRow.getByRole("button", { name: /Revertir|Reverse/i }).click();

  const reversalForm = page
    .locator("form")
    .filter({ has: page.getByRole("button", { name: /^(Aplicar reversa|Apply reversal)$/i }) })
    .first();
  await reversalForm.locator('input[type="number"]').first().fill("300");
  await reversalForm.locator("select.form-select").last().selectOption("duplicate_payment");
  await reversalForm.locator("input.form-control").last().fill(reversalNote);
  await reversalForm.getByRole("button", { name: /Aplicar reversa|Apply reversal/i }).click();

  await expect(getLoanFeedback(page)).toContainText(/reversa|reversal/i);

  const derivedSection = getDerivedAccountingSection(page);
  await expect(
    derivedSection.getByText(/Lectura contable derivada|Derived accounting reading/i)
  ).toBeVisible();
  await expect(derivedSection.getByText(/^2$/)).toHaveCount(1);
  await expect(derivedSection).toContainText(/Pago duplicado|Duplicate payment/i);
  await expect(derivedSection).toContainText(new RegExp(paymentNote));
  await expect(derivedSection).toContainText(new RegExp(reversalNote));
  await expect(derivedSection).toContainText(/pago|payment/i);
  await expect(derivedSection).toContainText(/reversa|reversal/i);

  const csvDownloadPromise = page.waitForEvent("download");
  await derivedSection.getByRole("button", { name: /Exportar CSV|Export CSV/i }).click();
  const csvDownload = await csvDownloadPromise;
  expect(csvDownload.suggestedFilename()).toMatch(/^finance-loan-accounting-\d+\.csv$/);
  const csvPath = await csvDownload.path();
  expect(csvPath).not.toBeNull();
  const csvContent = await readFile(csvPath!, "utf8");
  expect(csvContent).toContain("loan_id,loan_name,transaction_id");
  expect(csvContent).toContain(loanName);
  expect(csvContent).toContain(paymentNote);
  expect(csvContent).toContain(reversalNote);

  const jsonDownloadPromise = page.waitForEvent("download");
  await derivedSection.getByRole("button", { name: /Exportar JSON|Export JSON/i }).click();
  const jsonDownload = await jsonDownloadPromise;
  expect(jsonDownload.suggestedFilename()).toMatch(/^finance-loan-accounting-\d+\.json$/);
  const jsonPath = await jsonDownload.path();
  expect(jsonPath).not.toBeNull();
  const jsonContent = await readFile(jsonPath!, "utf8");
  const jsonPayload = JSON.parse(jsonContent) as {
    loan_name: string;
    accounting_summary: {
      total_items: number;
      payment_items: number;
      reversal_items: number;
    };
    accounting_transactions: Array<{
      action_type: string;
      notes: string | null;
    }>;
  };

  expect(jsonPayload.loan_name).toBe(loanName);
  expect(jsonPayload.accounting_summary.total_items).toBe(2);
  expect(jsonPayload.accounting_summary.payment_items).toBe(1);
  expect(jsonPayload.accounting_summary.reversal_items).toBe(1);
  expect(jsonPayload.accounting_transactions).toHaveLength(2);
  expect(jsonPayload.accounting_transactions.some((item) => item.action_type === "payment")).toBe(true);
  expect(jsonPayload.accounting_transactions.some((item) => item.action_type === "reversal")).toBe(true);
  expect(jsonPayload.accounting_transactions.some((item) => item.notes === paymentNote)).toBe(true);
  expect(jsonPayload.accounting_transactions.some((item) => item.notes === reversalNote)).toBe(true);
});
