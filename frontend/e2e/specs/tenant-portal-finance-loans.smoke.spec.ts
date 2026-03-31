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
  await expect(getSchedulePanel(page)).toBeVisible();
}

test("tenant portal finance loans creates a loan and records a simple installment payment", async ({
  page,
}) => {
  const loanName = `e2e-loan-${Date.now()}`;

  await ensureFinanceLoansPage(page);

  const createForm = page.locator("form").first();
  const accountSelect = createForm.locator("select.form-select").nth(3);
  const accountOptions = await accountSelect.locator("option").evaluateAll((options) =>
    options
      .map((option) => ({
        value: (option as HTMLOptionElement).value,
        text: option.textContent?.trim() || "",
      }))
      .filter((option) => option.value !== "")
  );

  await createForm.locator("input.form-control").nth(0).fill(loanName);
  await createForm.locator("input.form-control").nth(1).fill("Banco E2E");

  if (accountOptions.length > 0) {
    await accountSelect.selectOption(accountOptions[0].value);
  }

  await createForm.locator('input[type="number"]').nth(0).fill("900");
  await createForm.locator('input[type="number"]').nth(1).fill("900");
  await createForm.locator('input[type="number"]').nth(2).fill("12");
  await createForm.locator('input[type="number"]').nth(3).fill("3");
  await createForm.locator('input[type="date"]').nth(0).fill(buildTodayDateValue());
  await createForm.locator('input[type="date"]').nth(1).fill(buildFutureDateValue(90));
  await createForm.locator("textarea.form-control").fill("Préstamo creado por smoke E2E");

  await createForm
    .getByRole("button", { name: /Registrar préstamo|Create loan/i })
    .click();

  await expect(getLoanFeedback(page)).toContainText(/pr[eé]stamo|loan/i);

  const loanRow = getLoanRow(page, loanName);
  await expect(loanRow).toBeVisible();
  await expect(loanRow).toContainText(/abierto|open/i);
  await expect(loanRow).toContainText(/0\/3/);

  await openLoanSchedule(page, loanName);

  const scheduleTable = getSchedulePanel(page).locator("table").first();
  const firstInstallmentRow = scheduleTable.locator("tbody tr").first();
  await expect(firstInstallmentRow).toBeVisible();
  await firstInstallmentRow.getByRole("button", { name: /Registrar pago|Record payment/i }).click();

  const paymentForm = page
    .locator("form")
    .filter({ has: page.getByRole("button", { name: /Aplicar pago|Apply payment/i }) })
    .first();
  await paymentForm.locator('input[type="number"]').first().fill("300");
  await paymentForm.locator("input.form-control").first().fill("Abono smoke E2E");
  await paymentForm.getByRole("button", { name: /Aplicar pago|Apply payment/i }).click();

  await expect(getLoanFeedback(page)).toContainText(/pago|payment/i);
  await expect(firstInstallmentRow).toContainText(/300/);
});
