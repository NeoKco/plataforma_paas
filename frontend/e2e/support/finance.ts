import { expect, type Locator, type Page } from "@playwright/test";
import { buildE2EText } from "./e2e-data";

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
    .getByRole("dialog", {
      name: /Registrar transacción|Register transaction|Create transaction/i,
    })
    .locator("form")
    .first();
}

export async function openFinanceTransactionCreateForm(page: Page) {
  await page.getByRole("button", { name: /Registrar transacción|Register transaction/i }).click();
  const form = getFinanceTransactionForm(page);
  await expect(form).toBeVisible();
  return form;
}

export async function ensureFinanceAccount(page: Page, accountName: string) {
  await page.goto("/tenant-portal/finance/accounts");
  await page.waitForLoadState("networkidle");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: /Cuentas|Accounts/,
    })
  ).toBeVisible();
  await expect(
    page.getByText(/Cargando cuentas financieras|Loading financial accounts/i)
  ).toHaveCount(0);

  const catalogCard = page.locator(".data-table-card").first();
  const existingRows = catalogCard.locator("tbody tr");
  const existingCount = await existingRows.count();
  if (existingCount > 0) {
    return;
  }

  await page.getByRole("button", { name: /Nueva cuenta|New account/i }).click();
  const accountForm = page
    .getByRole("dialog", { name: /Nueva cuenta|New account/i })
    .locator("form")
    .first();
  await expect(accountForm).toBeVisible();

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
  await codeField.fill(buildE2EText("finance-account-code", "E2E").toUpperCase());

  await accountForm.getByRole("button", { name: /Crear cuenta|Create account/ }).click();
  await expect(
    catalogCard.locator("tbody tr").filter({ hasText: accountName }).first()
  ).toBeVisible({ timeout: 10000 });
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
  let activeForm = form;
  if ((await activeForm.count()) === 0) {
    activeForm = await openFinanceTransactionCreateForm(page);
  }

  const sourceAccountReady = await hasAvailableSourceAccount(activeForm);
  if (!sourceAccountReady) {
    await ensureFinanceAccount(page, accountName);
    await openFinanceTransactionsPage(page);
    activeForm = await openFinanceTransactionCreateForm(page);
  }

  await ensureSourceAccountSelected(activeForm);
  return activeForm;
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
  const uniqueAccountName = buildE2EText("finance-account", "e2e-caja");
  let form = await openFinanceTransactionCreateForm(page);
  form = await ensureFinanceTransactionFormReady(page, form, uniqueAccountName);

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

  const transactionFormDialog = page.getByRole("dialog", {
    name: /Registrar transacción|Register transaction|Create transaction/i,
  });
  if ((await transactionFormDialog.count()) > 0) {
    const cancelButton = transactionFormDialog.getByRole("button", {
      name: /Cancelar|Cancel/i,
    });
    if ((await cancelButton.count()) > 0) {
      await cancelButton.click();
      await expect(transactionFormDialog).toHaveCount(0);
    }
  }
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
