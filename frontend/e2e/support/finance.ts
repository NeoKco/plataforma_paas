import { expect, type Locator, type Page } from "@playwright/test";

export async function openFinanceTransactionsPage(page: Page) {
  await page.goto("/tenant-portal/finance");
  await expect(
    page.getByRole("heading", {
      name: /Transacciones financieras|Financial transactions/,
    })
  ).toBeVisible();
  await ensureFinanceWorkspaceReady(page);
}

export function getFinanceTransactionForm(page: Page) {
  return page
    .locator("form")
    .filter({
      has: page.getByRole("button", {
        name: /Registrar transacción|Create transaction/,
      }),
    })
    .first();
}

export async function ensureFinanceAccount(page: Page, accountName: string) {
  await page.goto("/tenant-portal/finance/accounts");
  await expect(
    page.getByRole("heading", {
      name: /Cuentas|Accounts/,
    })
  ).toBeVisible();

  const catalogCard = page.locator(".data-table-card").first();
  const existingRows = catalogCard.locator("tbody tr");
  const existingCount = await existingRows.count();
  if (existingCount > 0) {
    return;
  }

  const accountForm = page
    .locator("form")
    .filter({
      has: page.getByRole("button", { name: /Crear cuenta|Create account/i }),
    })
    .first();

  await accountForm
    .locator(".app-form-field")
    .filter({ hasText: /Nombre|Name/i })
    .first()
    .locator("input.form-control")
    .fill(accountName);

  const codeField = accountForm
    .locator(".app-form-field")
    .filter({ hasText: /Código|Code/i })
    .first()
    .locator("input.form-control");
  await codeField.fill(`E2E-${Date.now()}`);

  await accountForm.getByRole("button", { name: /Crear cuenta|Create account/ }).click();
  await expect(page.getByText(accountName)).toBeVisible();
}

export async function ensureFinanceWorkspaceReady(page: Page) {
  await expect(
    page.getByText(/Cargando transacciones financieras|Loading financial transactions/i)
  ).toHaveCount(0);
}

export async function ensureSourceAccountSelected(form: Locator) {
  const sourceAccountSelect = getSourceAccountSelect(form);
  await expect
    .poll(async () => {
      return sourceAccountSelect.locator("option").count();
    })
    .toBeGreaterThan(0);

  const selectedValue = await sourceAccountSelect.inputValue();
  if (selectedValue) {
    return;
  }

  const optionValues = await sourceAccountSelect.locator("option").evaluateAll((options) =>
    options
      .map((option) => (option as HTMLOptionElement).value)
      .filter((value) => value !== "")
  );

  if (optionValues.length === 0) {
    throw new Error("Finance transaction smoke could not find an available source account.");
  }

  await sourceAccountSelect.selectOption(optionValues[0]);
}

export async function ensureFinanceTransactionFormReady(
  page: Page,
  form: Locator,
  accountName: string
) {
  const sourceAccountReady = await hasAvailableSourceAccount(form);
  if (!sourceAccountReady) {
    await ensureFinanceAccount(page, accountName);
    await openFinanceTransactionsPage(page);
  }

  await ensureSourceAccountSelected(form);
}

export async function createBasicExpenseTransaction(
  page: Page,
  description: string,
  amount = "12345"
) {
  await createBasicTransaction(page, {
    transactionType: "expense",
    description,
    amount,
  });
}

export async function createBasicIncomeTransaction(
  page: Page,
  description: string,
  amount = "12345"
) {
  await createBasicTransaction(page, {
    transactionType: "income",
    description,
    amount,
  });
}

export async function createBasicTransaction(
  page: Page,
  options: {
    transactionType: "income" | "expense";
    description: string;
    amount?: string;
  }
) {
  const form = getFinanceTransactionForm(page);
  const uniqueAccountName = `e2e-caja-${Date.now()}`;
  await ensureFinanceTransactionFormReady(page, form, uniqueAccountName);

  await form.getByRole("combobox").first().selectOption(options.transactionType);
  await form.locator('input[type="number"]').first().fill(options.amount || "12345");
  await form
    .getByPlaceholder(/Pago proveedor de mantención|provider maintenance/i)
    .fill(options.description);
  await form
    .getByRole("button", {
      name: /Registrar transacción|Create transaction/,
    })
    .click();

  await expect(getTransactionSuccessFeedback(page)).toContainText(
    /Transacci[oó]n|Transaction/i
  );
  await expect(getTransactionRowByDescription(page, options.description)).toBeVisible();
}

export function getTransactionSuccessFeedback(page: Page) {
  return page
    .locator(".tenant-action-feedback--success")
    .filter({ hasText: /Transacci[oó]n|Transaction/i })
    .first();
}

export function getTransactionRowByDescription(page: Page, description: string) {
  return page.getByRole("table").getByText(description).first();
}

export function getTransactionRowContainerByDescription(page: Page, description: string) {
  return getTransactionRowByDescription(page, description).locator("xpath=ancestor::tr[1]");
}

export function getAttachmentSuccessFeedback(page: Page) {
  return page
    .locator(".tenant-action-feedback--success")
    .filter({ hasText: /Adjuntos|Attachments|Adjunto|Attachment/i })
    .first();
}

export function getReconciliationSuccessFeedback(page: Page) {
  return page
    .locator(".tenant-action-feedback--success")
    .filter({ hasText: /Conciliaci[oó]n|Reconciliation/i })
    .first();
}

async function hasAvailableSourceAccount(form: Locator) {
  const sourceAccountSelect = getSourceAccountSelect(form);
  await expect
    .poll(async () => {
      return sourceAccountSelect.locator("option").count();
    })
    .toBeGreaterThan(0);

  const optionValues = await sourceAccountSelect.locator("option").evaluateAll((options) =>
    options
      .map((option) => (option as HTMLOptionElement).value)
      .filter((value) => value !== "")
  );

  return optionValues.length > 0;
}

function getSourceAccountSelect(form: Locator) {
  return form.getByRole("combobox").nth(1);
}
