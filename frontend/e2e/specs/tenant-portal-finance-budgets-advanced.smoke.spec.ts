import { expect, test, type Page } from "@playwright/test";
import { loginTenant } from "../support/auth";

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
  await expect(page.getByRole("heading", { name: /Presupuestos|Budgets/i })).toBeVisible();
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
    page.getByRole("heading", { level: 1, name: /Categorías|Categories/i })
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
    .fill("#14b8a6");

  await form.getByRole("button", { name: /Crear categoría|Create category/i }).click();
  await expect(getCategoryRow(page, categoryName)).toBeVisible();
}

async function deactivateBudgetCategory(page: Page, categoryName: string) {
  await ensureFinanceCategoriesPage(page);
  const row = getCategoryRow(page, categoryName);
  if ((await row.count()) === 0) {
    return;
  }
  const deactivateButton = row.getByRole("button", { name: /Desactivar|Deactivate/i });
  if ((await deactivateButton.count()) === 0) {
    return;
  }
  await deactivateButton.click();
  await expect(row).toContainText(/inactiva|inactive/i);
}

function getSuccessFeedback(page: Page) {
  return page.locator(".tenant-action-feedback--success").first();
}

function getPeriodPanel(page: Page) {
  return page
    .locator(".panel-card")
    .filter({ has: page.getByText(/Lectura del período|Period view/i) })
    .first();
}

function getFocusPanel(page: Page) {
  return page
    .locator(".panel-card")
    .filter({ has: page.getByText(/Foco presupuestario|Budget focus/i) })
    .first();
}

function getBudgetRow(page: Page, categoryName: string) {
  return page.locator("table").last().locator("tbody tr").filter({ hasText: categoryName }).first();
}

function getFocusRow(page: Page, categoryName: string) {
  return getFocusPanel(page).locator("tbody tr").filter({ hasText: categoryName }).first();
}

test("tenant portal finance budgets applies a template and guided adjustment on the visible month", async ({
  page,
}) => {
  const sourceMonth = buildMonthValue(12);
  const targetMonth = buildMonthValue(13);
  const categoryName = `e2e-budget-advanced-${Date.now()}`;

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
      throw new Error(`Budget advanced smoke could not find category option: ${categoryName}`);
    }

    await createForm.locator('input[type="month"]').first().fill(sourceMonth);
    await categorySelect.selectOption(categoryValue);
    await createForm.locator('input[type="number"]').first().fill("1000");
    await createForm.locator("textarea.form-control").fill("Presupuesto fuente para plantilla E2E");
    await createForm.getByRole("button", { name: /Registrar presupuesto|Create budget/i }).click();

    const sourceRow = getBudgetRow(page, categoryName);
    await expect(sourceRow).toBeVisible();

    const periodPanel = getPeriodPanel(page);
    await periodPanel.locator('input[type="month"]').first().fill(targetMonth);
    await periodPanel.locator('select.form-select').last().selectOption("previous_month");
    await periodPanel.locator('input[type="number"]').nth(0).fill("110");
    await periodPanel.locator('input[type="number"]').nth(1).fill("10");
    await periodPanel.getByRole("button", { name: /Aplicar plantilla al mes visible|Apply template to visible month/i }).click();

    await expect(getSuccessFeedback(page)).toContainText(/plantilla|template/i);
    await expect(getSuccessFeedback(page)).toContainText(/creados|created/i);

    const targetRow = getBudgetRow(page, categoryName);
    await expect(targetRow).toBeVisible();
    await expect(targetRow).toContainText(/1[.,]100/);
    await expect(targetRow).toContainText(/sin ejecución|unused/i);

    const focusRow = getFocusRow(page, categoryName);
    await expect(focusRow).toBeVisible();
    await expect(focusRow).toContainText(/revisar uso|review usage/i);
    await focusRow.getByRole("button", { name: /Desactivar sin uso|Deactivate unused/i }).click();

    await expect(getSuccessFeedback(page)).toContainText(/presupuesto|budget/i);
    await expect(getBudgetRow(page, categoryName)).toContainText(/inactivo|inactive/i);
    await expect
      .poll(async () => {
        const nextFocusRow = getFocusRow(page, categoryName);
        if ((await nextFocusRow.count()) === 0) {
          return "removed";
        }
        return (await nextFocusRow.textContent()) || "";
      })
      .toMatch(/removed|inactivo|inactive/i);
  } finally {
    await deactivateBudgetCategory(page, categoryName);
  }
});
