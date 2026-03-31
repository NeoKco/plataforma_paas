import { expect, test, type Page } from "@playwright/test";
import { loginTenant } from "../support/auth";

async function ensureFinanceSettingsPage(page: Page) {
  await page.goto("/tenant-portal/finance/settings");
  await page.waitForLoadState("networkidle");

  if (/\/tenant-portal\/login($|[?#])/.test(page.url())) {
    await loginTenant(page);
    await page.goto("/tenant-portal/finance/settings");
    await page.waitForLoadState("networkidle");
  }

  await expect(page).toHaveURL(/\/tenant-portal\/finance\/settings($|[/?#])/);
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: /Configuración financiera|Financial settings/i,
    })
  ).toBeVisible();
}

function getSuccessAlert(page: Page) {
  return page.locator(".alert.alert-success").first();
}

function expectSettingsSuccess(page: Page) {
  return expect(getSuccessAlert(page)).toContainText(
    /configuraci[oó]n financiera|financial settings|setting/i
  );
}

function getCurrentForm(page: Page) {
  return page.locator("form").first();
}

function getTableRow(page: Page, text: string) {
  return page.locator("tbody tr").filter({ hasText: text }).first();
}

test("tenant portal finance settings manages currencies, exchange rates and parameters", async ({
  page,
}) => {
  const suffix = `${Date.now()}`.slice(-6);
  const currencyCode = `XZ${suffix}`;
  const currencyName = `e2e-finance-currency-${suffix}`;
  const settingKey = `e2e.setting.${suffix}`;
  const settingValue = `valor inicial ${suffix}`;
  const updatedSettingValue = `valor editado ${suffix}`;
  const exchangeRateValue = `7.${suffix}`;

  await ensureFinanceSettingsPage(page);

  const currencyForm = getCurrentForm(page);
  await currencyForm
    .locator(".app-form-field")
    .filter({ hasText: /Código|Code/i })
    .first()
    .locator("input.form-control")
    .fill(currencyCode);
  await currencyForm
    .locator(".app-form-field")
    .filter({ hasText: /Nombre|Name/i })
    .first()
    .locator("input.form-control")
    .fill(currencyName);
  await currencyForm
    .locator(".app-form-field")
    .filter({ hasText: /Símbolo|Symbol/i })
    .first()
    .locator("input.form-control")
    .fill(`¤${suffix.slice(-2)}`);
  await currencyForm.getByRole("button", { name: /Crear moneda|Create currency/i }).click();

  await expect(getSuccessAlert(page)).toContainText(/moneda|currency/i);

  const currencyRow = getTableRow(page, currencyCode);
  await expect(currencyRow).toBeVisible();
  await expect(currencyRow).toContainText(new RegExp(`${currencyName}|activa|active`, "i"));

  await currencyRow.getByRole("button", { name: /Desactivar|Deactivate/i }).click();
  await expect(getSuccessAlert(page)).toContainText(/moneda|currency/i);
  await expect(currencyRow).toContainText(/inactiva|inactive/i);

  await currencyRow.getByRole("button", { name: /Activar|Activate/i }).click();
  await expect(getSuccessAlert(page)).toContainText(/moneda|currency/i);
  await expect(currencyRow).toContainText(/activa|active/i);

  await page.getByRole("button", { name: /Tipos de cambio|Exchange rates/i }).click();
  const exchangeRateForm = getCurrentForm(page);
  const selectOptions = await exchangeRateForm.locator("select.form-select").first().locator("option").evaluateAll(
    (options) =>
      options.map((option) => ({
        value: (option as HTMLOptionElement).value,
        text: option.textContent?.trim() || "",
      }))
  );
  const sourceOption = selectOptions.find((option) => option.text === currencyCode);
  const targetOption = selectOptions.find((option) => option.text !== currencyCode);

  if (!sourceOption || !targetOption) {
    throw new Error("No se encontraron opciones válidas para crear tipo de cambio E2E.");
  }

  await exchangeRateForm.locator("select.form-select").nth(0).selectOption(sourceOption.value);
  await exchangeRateForm.locator("select.form-select").nth(1).selectOption(targetOption.value);
  await exchangeRateForm
    .locator(".app-form-field")
    .filter({ hasText: /Tasa|Rate/i })
    .first()
    .locator('input[type="number"]')
    .fill(exchangeRateValue);
  await exchangeRateForm
    .locator(".app-form-field")
    .filter({ hasText: /Fuente|Source/i })
    .first()
    .locator("input.form-control")
    .fill(`manual-e2e-${suffix}`);
  await exchangeRateForm
    .getByRole("button", { name: /Crear tipo de cambio|Create exchange rate/i })
    .click();

  await expect(getSuccessAlert(page)).toContainText(/tipo de cambio|exchange rate/i);

  const exchangeRateRow = page
    .locator("tbody tr")
    .filter({ hasText: new RegExp(`${currencyCode}\s*→|${currencyCode}`, "i") })
    .filter({ hasText: exchangeRateValue })
    .first();
  await expect(exchangeRateRow).toBeVisible();

  page.once("dialog", (dialog) => dialog.accept());
  await exchangeRateRow.getByRole("button", { name: /Eliminar|Delete/i }).click();
  await expect(getSuccessAlert(page)).toContainText(/tipo de cambio|exchange rate/i);
  await expect(exchangeRateRow).toHaveCount(0);

  await page.getByRole("button", { name: /Monedas|Currencies/i }).click();
  page.once("dialog", (dialog) => dialog.accept());
  await currencyRow.getByRole("button", { name: /Eliminar|Delete/i }).click();
  await expect(getSuccessAlert(page)).toContainText(/moneda|currency/i);
  await expect(getTableRow(page, currencyCode)).toHaveCount(0);

  await page.getByRole("button", { name: /Parámetros|Parameters/i }).click();
  const settingForm = getCurrentForm(page);
  await settingForm
    .locator(".app-form-field")
    .filter({ hasText: /Clave|Key/i })
    .first()
    .locator("input.form-control")
    .fill(settingKey);
  await settingForm
    .locator(".app-form-field")
    .filter({ hasText: /Valor|Value/i })
    .first()
    .locator("textarea.form-control")
    .fill(settingValue);
  await settingForm.getByRole("button", { name: /Crear parámetro|Create parameter/i }).click();

  await expectSettingsSuccess(page);

  const settingRow = getTableRow(page, settingKey);
  await expect(settingRow).toBeVisible();
  await expect(settingRow).toContainText(settingValue);
  await expect(settingRow).toContainText(/activo|active/i);

  await settingRow.getByRole("button", { name: /Editar|Edit/i }).click();
  const settingEditForm = getCurrentForm(page);
  await settingEditForm
    .locator(".app-form-field")
    .filter({ hasText: /Valor|Value/i })
    .first()
    .locator("textarea.form-control")
    .fill(updatedSettingValue);
  await settingEditForm.getByRole("button", { name: /Guardar cambios|Save changes/i }).click();

  await expectSettingsSuccess(page);
  await expect(settingRow).toContainText(updatedSettingValue);

  await settingRow.getByRole("button", { name: /Desactivar|Deactivate/i }).click();
  await expectSettingsSuccess(page);
  await expect(settingRow).toContainText(/inactivo|inactive/i);

  await settingRow.getByRole("button", { name: /Activar|Activate/i }).click();
  await expectSettingsSuccess(page);
  await expect(settingRow).toContainText(/activo|active/i);
});
