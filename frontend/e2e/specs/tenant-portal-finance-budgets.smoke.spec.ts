import { expect, test, type Page } from "@playwright/test";
import { loginTenant } from "../support/auth";

function buildMonthValue(offsetMonths = 0) {
  const date = new Date();
  date.setUTCDate(1);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCMonth(date.getUTCMonth() + offsetMonths);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function buildMonthIso(monthValue: string) {
  return `${monthValue}-01`;
}

function formatMonthLabel(monthIso: string) {
  return new Intl.DateTimeFormat("es-CL", {
    month: "short",
    year: "numeric",
  }).format(new Date(monthIso));
}

async function ensureFinanceBudgetsPage(page: Page) {
  await page.goto("/tenant-portal/finance/budgets");
  await page.waitForLoadState("networkidle");

  if (/\/tenant-portal\/login($|[?#])/.test(page.url())) {
    await loginTenant(page);
    await page.goto("/tenant-portal/finance/budgets");
    await page.waitForLoadState("networkidle");
  }

  await expect(page).toHaveURL(/\/tenant-portal\/finance\/budgets($|[/?#])/);
  await expect(
    page.getByRole("heading", {
      name: /Presupuestos|Budgets/,
    })
  ).toBeVisible();
}

function getBudgetFeedback(page: Page) {
  return page.locator(".tenant-action-feedback--success").first();
}

function getPeriodTable(page: Page) {
  return page.locator("table").last();
}

function getBudgetRow(page: Page, options: { monthLabel: string; categoryName: string }) {
  return getPeriodTable(page)
    .locator("tbody tr")
    .filter({ hasText: options.monthLabel })
    .filter({ hasText: options.categoryName })
    .first();
}

test("tenant portal finance budgets creates a budget and clones it into another visible month", async ({
  page,
}) => {
  const sourceMonth = buildMonthValue(10);
  const targetMonth = buildMonthValue(11);
  const budgetAmount = "54321";
  const budgetNote = `Presupuesto E2E ${Date.now()}`;

  await ensureFinanceBudgetsPage(page);

  const createForm = page.locator("form").first();
  const categorySelect = createForm.locator("select.form-select").first();
  const selectedCategoryLabel = (
    await categorySelect.locator("option:checked").first().innerText()
  ).trim();
  const categoryName = selectedCategoryLabel.split("·")[0].trim();

  await createForm.locator('input[type="month"]').first().fill(sourceMonth);
  await createForm.locator('input[type="number"]').first().fill(budgetAmount);
  await createForm.locator("textarea.form-control").fill(budgetNote);
  await createForm
    .getByRole("button", { name: /Registrar presupuesto|Create budget/i })
    .click();

  await expect(getBudgetFeedback(page)).toContainText(/presupuesto|budget/i);

  const sourceRow = getBudgetRow(page, {
    monthLabel: formatMonthLabel(buildMonthIso(sourceMonth)),
    categoryName,
  });
  await expect(sourceRow).toBeVisible();
  await expect(sourceRow).toContainText(/sin ejecución|unused|dentro del presupuesto|within budget/i);

  const periodPanel = page
    .locator(".panel-card")
    .filter({
      has: page.getByText(/Lectura del período|Period view/i),
    })
    .first();

  await periodPanel.locator('input[type="month"]').first().fill(targetMonth);
  await periodPanel.locator('input[type="month"]').nth(1).fill(sourceMonth);
  await periodPanel
    .getByRole("button", { name: /Clonar al mes visible|Clone into visible month/i })
    .click();

  await expect(getBudgetFeedback(page)).toContainText(/clonados|cloned|creados|created/i);

  const clonedRow = getBudgetRow(page, {
    monthLabel: formatMonthLabel(buildMonthIso(targetMonth)),
    categoryName,
  });
  await expect(clonedRow).toBeVisible();
  await expect(clonedRow).toContainText(/sin ejecución|unused|dentro del presupuesto|within budget/i);
});
