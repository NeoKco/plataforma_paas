import { expect, test } from "@playwright/test";
import { loginTenant } from "../support/auth";

test("tenant portal finance can create a basic transaction", async ({ page }) => {
  const uniqueDescription = `e2e-mov-${Date.now()}`;
  const uniqueAccountName = `e2e-caja-${Date.now()}`;

  await loginTenant(page);
  await page.goto("/tenant-portal/finance");

  await expect(
    page.getByRole("heading", {
      name: /Transacciones financieras|Financial transactions/,
    })
  ).toBeVisible();

  const form = page
    .locator("form")
    .filter({
      has: page.getByRole("button", {
        name: /Registrar transacción|Create transaction/,
      }),
    })
    .first();

  await ensureFinanceWorkspaceReady(page);
  const sourceAccountReady = await hasAvailableSourceAccount(form);
  if (!sourceAccountReady) {
    await ensureFinanceAccount(page, uniqueAccountName);
    await page.goto("/tenant-portal/finance");
    await expect(
      page.getByRole("heading", {
        name: /Transacciones financieras|Financial transactions/,
      })
    ).toBeVisible();
    await ensureFinanceWorkspaceReady(page);
  }

  await ensureSourceAccountSelected(form);
  await form.locator('input[type="number"]').first().fill("12345");
  await form
    .getByPlaceholder(/Pago proveedor de mantención|provider maintenance/i)
    .fill(uniqueDescription);
  await form
    .getByRole("button", {
      name: /Registrar transacción|Create transaction/,
    })
    .click();

  await expect(
    page
      .locator(".tenant-action-feedback--success")
      .filter({ hasText: /Transacci[oó]n|Transaction/i })
      .first()
  ).toContainText(/Transacci[oó]n|Transaction/i);
  await expect(
    page.getByRole("table").getByText(uniqueDescription).first()
  ).toBeVisible();
});

async function ensureFinanceAccount(page: Parameters<typeof test>[0]["page"], accountName: string) {
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

  const accountForm = page.locator("form").first();
  await accountForm.getByLabel(/Nombre|Name/).fill(accountName);
  await accountForm.getByRole("button", { name: /Crear cuenta|Create account/ }).click();

  await expect(page.locator(".alert.alert-success")).toContainText(/Cuenta|Account/i);
  await expect(page.getByText(accountName)).toBeVisible();
}

async function ensureFinanceWorkspaceReady(page: Parameters<typeof test>[0]["page"]) {
  await expect(page.getByText(/Cargando transacciones financieras|Loading financial transactions/i)).toHaveCount(0);
}

async function hasAvailableSourceAccount(
  form: ReturnType<Parameters<typeof test>[0]["page"]["locator"]>
) {
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

async function ensureSourceAccountSelected(form: ReturnType<Parameters<typeof test>[0]["page"]["locator"]>) {
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

function getSourceAccountSelect(
  form: ReturnType<Parameters<typeof test>[0]["page"]["locator"]>
) {
  return form.getByRole("combobox").nth(1);
}
