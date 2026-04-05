import { expect, test, type Locator, type Page } from "../support/test";
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
  await expect(page.getByRole("heading", { name: /Préstamos|Loans/ })).toBeVisible();
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

function getScheduleTable(page: Page) {
  return getSchedulePanel(page).locator("table").first();
}

function getBatchForm(page: Page) {
  return getSchedulePanel(page).locator("form").first();
}

async function openLoanCreateForm(page: Page) {
  await page.getByRole("button", { name: /Nuevo préstamo|New loan/i }).click();
  const dialog = page.getByRole("dialog", { name: /Registrar préstamo|Create loan/i });
  await expect(dialog).toBeVisible();
  return dialog.locator("form").first();
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
  await expect(getScheduleTable(page)).toBeVisible();
}

async function createLoanAndOpenSchedule(page: Page, loanName: string) {
  await ensureFinanceLoansPage(page);

  const createForm = await openLoanCreateForm(page);
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
  await createForm.locator("input.form-control").nth(1).fill("Banco Batch E2E");

  if (accountOptions.length > 0) {
    await accountSelect.selectOption(accountOptions[0].value);
  }

  await createForm.locator('input[type="number"]').nth(0).fill("1200");
  await createForm.locator('input[type="number"]').nth(1).fill("1200");
  await createForm.locator('input[type="number"]').nth(2).fill("10");
  await createForm.locator('input[type="number"]').nth(3).fill("3");
  await createForm.locator('input[type="date"]').nth(0).fill(buildTodayDateValue());
  await createForm.locator('input[type="date"]').nth(1).fill(buildFutureDateValue(90));
  await createForm.locator("textarea.form-control").fill("Préstamo batch creado por smoke E2E");

  await createForm
    .getByRole("button", { name: /Registrar préstamo|Create loan/i })
    .click();

  await expect(getLoanFeedback(page)).toContainText(/pr[eé]stamo|loan/i);

  await openLoanSchedule(page, loanName);
}

function getInstallmentRows(page: Page) {
  return getScheduleTable(page).locator("tbody tr");
}

async function setInstallmentChecked(row: Locator, checked: boolean) {
  const checkbox = row.locator('input[type="checkbox"]').first();
  await checkbox.scrollIntoViewIfNeeded();
  await checkbox.setChecked(checked);
}

test("tenant portal finance loans applies batch payment and batch reversal over selected installments", async ({
  page,
}) => {
  const loanName = `e2e-loan-batch-${Date.now()}`;

  await createLoanAndOpenSchedule(page, loanName);

  const installmentRows = getInstallmentRows(page);
  const firstRow = installmentRows.nth(0);
  const secondRow = installmentRows.nth(1);

  await expect(firstRow).toBeVisible();
  await expect(secondRow).toBeVisible();

  await setInstallmentChecked(firstRow, true);
  await setInstallmentChecked(secondRow, true);

  const batchForm = getBatchForm(page);

  await expect(
    batchForm.getByRole("button", { name: /Aplicar pago en lote|Apply batch payment/i })
  ).toBeEnabled();

  await batchForm.locator("input.form-control").last().fill("Batch payment E2E");
  await batchForm
    .getByRole("button", { name: /Aplicar pago en lote|Apply batch payment/i })
    .click();

  await expect(getLoanFeedback(page)).toContainText(/pago|payment/i);
  await expect(getLoanFeedback(page)).toContainText(/2 cuotas|2 installments|2/i);

  await expect(firstRow).toContainText(/pagada|paid/i);
  await expect(secondRow).toContainText(/pagada|paid/i);

  await setInstallmentChecked(firstRow, true);
  await setInstallmentChecked(secondRow, true);

  await batchForm.getByRole("combobox").first().selectOption("reverse");
  await batchForm.locator("input.form-control").last().fill("Batch reversal E2E");
  await batchForm.locator("select.form-select").last().selectOption("duplicate_payment");
  await batchForm
    .getByRole("button", { name: /Aplicar reversa en lote|Apply batch reversal/i })
    .click();

  await expect(getLoanFeedback(page)).toContainText(/reversa|reversal/i);
  await expect(getLoanFeedback(page)).toContainText(/2 cuotas|2 installments|2/i);

  await expect(firstRow).toContainText(/Pago duplicado|Duplicate payment/i);
  await expect(secondRow).toContainText(/Pago duplicado|Duplicate payment/i);
  await expect(firstRow).not.toContainText(/pagada|paid/i);
  await expect(secondRow).not.toContainText(/pagada|paid/i);
});
