import { expect, test, type Page } from "../support/test";
import { loginTenant } from "../support/auth";
import { buildE2EText } from "../support/e2e-data";

function buildMonthValue(offsetMonths = 0) {
  const date = new Date();
  date.setUTCDate(1);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCMonth(date.getUTCMonth() + offsetMonths);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
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

async function ensureFinanceCategoriesPage(page: Page) {
  await page.goto("/tenant-portal/finance/categories");
  await page.waitForLoadState("networkidle");

  if (/\/tenant-portal\/login($|[?#])/.test(page.url())) {
    await loginTenant(page);
    await page.goto("/tenant-portal/finance/categories");
    await page.waitForLoadState("networkidle");
  }

  await expect(page).toHaveURL(/\/tenant-portal\/finance\/categories($|[/?#])/);
  await expect(
    page.getByRole("heading", {
      name: /Categorías|Categories/,
    })
  ).toBeVisible();
}

function getCategoryRow(page: Page, categoryName: string) {
  return page.locator("tbody tr").filter({ hasText: categoryName }).first();
}

async function openBudgetCategoryCreateForm(page: Page) {
  await page.getByRole("button", { name: /Nueva categoría|New category/i }).click();
  const dialog = page.getByRole("dialog", { name: /Nueva categoría|New category/i });
  await expect(dialog).toBeVisible();
  return dialog.locator("form").first();
}

async function openBudgetCreateForm(page: Page) {
  await page.getByRole("button", { name: /Nuevo presupuesto|New budget/i }).click();
  const dialog = page.getByRole("dialog", {
    name: /Registrar presupuesto|Create budget/i,
  });
  await expect(dialog).toBeVisible();
  return dialog.locator("form").first();
}

async function createBudgetCategory(page: Page, categoryName: string) {
  await ensureFinanceCategoriesPage(page);

  const form = await openBudgetCategoryCreateForm(page);

  await form
    .locator(".app-form-field")
    .filter({ hasText: /Nombre|Name/i })
    .first()
    .locator("input.form-control")
    .fill(categoryName);
  await form
    .locator(".app-form-field")
    .filter({ hasText: /Tipo|Type/i })
    .first()
    .locator("select.form-select")
    .selectOption("expense");
  await form
    .locator(".app-form-field")
    .filter({ hasText: /Color|Color/i })
    .first()
    .locator("input.form-control")
    .fill("#0ea5e9");

  await form.getByRole("button", { name: /Crear categoría|Create category/i }).click();
  await expect(getCategoryRow(page, categoryName)).toBeVisible();
}

async function deactivateBudgetCategory(page: Page, categoryName: string) {
  await ensureFinanceCategoriesPage(page);
  const categoryRow = getCategoryRow(page, categoryName);
  if ((await categoryRow.count()) === 0) {
    return;
  }
  const deactivateButton = categoryRow.getByRole("button", {
    name: /Desactivar|Deactivate/i,
  });
  if ((await deactivateButton.count()) === 0) {
    return;
  }
  await deactivateButton.click();
  await expect(categoryRow).toContainText(/inactiva|inactive/i);
}

function getPeriodTable(page: Page) {
  return page.locator("table").last();
}

function getBudgetRow(page: Page, options: { categoryName: string }) {
  return getPeriodTable(page)
    .locator("tbody tr")
    .filter({ hasText: options.categoryName })
    .first();
}

test("tenant portal finance budgets creates a budget and clones it into another visible month", async ({
  page,
}) => {
  const sourceMonth = buildMonthValue(10);
  const targetMonth = buildMonthValue(11);
  const budgetAmount = "54321";
  const budgetNote = buildE2EText("budget-note", "Presupuesto E2E");
  const categoryName = buildE2EText("budget-category", "e2e-budget-category");

  try {
    await createBudgetCategory(page, categoryName);
    await ensureFinanceBudgetsPage(page);

    const createForm = await openBudgetCreateForm(page);
    const categorySelect = createForm.locator("select.form-select").first();
    const categoryValue = await categorySelect.locator("option").evaluateAll((options, target) => {
      const matched = options.find((option) => option.textContent?.includes(target));
      return (matched as HTMLOptionElement | undefined)?.value || "";
    }, categoryName);
    if (!categoryValue) {
      throw new Error(`Budget smoke could not find category option: ${categoryName}`);
    }

    await createForm.locator('input[type="month"]').first().fill(sourceMonth);
    await categorySelect.selectOption(categoryValue);
    await createForm.locator('input[type="number"]').first().fill(budgetAmount);
    await createForm.locator("textarea.form-control").fill(budgetNote);
    await createForm
      .getByRole("button", { name: /Registrar presupuesto|Create budget/i })
      .click();

    const sourceRow = getBudgetRow(page, {
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

    const clonedRow = getBudgetRow(page, {
      categoryName,
    });
    await expect(clonedRow).toBeVisible();
    await expect(clonedRow).toContainText(/sin ejecución|unused|dentro del presupuesto|within budget/i);
  } finally {
    await deactivateBudgetCategory(page, categoryName);
  }
});
