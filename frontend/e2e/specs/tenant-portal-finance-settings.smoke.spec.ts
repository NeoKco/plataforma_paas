import { expect, test, type Page } from "../support/test";
import { loginTenant } from "../support/auth";
import { buildE2EText } from "../support/e2e-data";

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

async function openFinanceSettingsForm(page: Page, tabName: RegExp) {
  await page.getByRole("button", { name: tabName }).click();
  await page.getByRole("button", { name: /Nuevo registro|New record/i }).click();
  const dialog = page.getByRole("dialog", {
    name: /Alta o edición financiera|Finance create or edit/i,
  });
  await expect(dialog).toBeVisible();
  return dialog.locator("form").first();
}

function getTableRow(page: Page, text: string) {
  return page.locator("tbody tr").filter({ hasText: text }).first();
}

test("tenant portal finance settings manages currencies, exchange rates and parameters", async ({
  page,
}) => {
  const currencySeed = buildE2EText("finance-settings-currency", "id");
  const currencyDigits = currencySeed.replace(/\D/g, "").slice(-6).padStart(6, "7");
  const currencyCode = `XZ${currencyDigits.slice(-4)}`;
  const currencyName = buildE2EText("finance-settings-currency-name", "e2e-finance-currency");
  const settingKey = buildE2EText("finance-settings-key", "e2e.setting").replace(/-/g, ".");
  const settingValue = buildE2EText("finance-settings-value", "valor inicial");
  const updatedSettingValue = buildE2EText("finance-settings-updated", "valor editado");
  const exchangeRateValue = `7.${currencyDigits}`;

  await ensureFinanceSettingsPage(page);

  const currencyForm = await openFinanceSettingsForm(page, /Monedas|Currencies/i);
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
    .fill(`¤${currencyDigits.slice(-2)}`);
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
  const exchangeRateForm = await openFinanceSettingsForm(page, /Tipos de cambio|Exchange rates/i);
  const selectOptions = await exchangeRateForm.locator("select.form-select").first().locator("option").evaluateAll(
    (options) =>
      options.map((option) => ({
        value: (option as HTMLOptionElement).value,
        text: option.textContent?.trim() || "",
      }))
  );
  const usableOptions = selectOptions.filter((option) => option.value.trim() !== "");
  const sourceOption = usableOptions.find((option) => option.text.includes(currencyCode));
  const targetOption = usableOptions.find((option) => !option.text.includes(currencyCode));

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
    .fill(buildE2EText("finance-settings-source", "manual-e2e"));
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

  const settingForm = await openFinanceSettingsForm(page, /Parámetros|Parameters/i);
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
  const settingEditForm = page.getByRole("dialog", {
    name: /Alta o edición financiera|Finance create or edit/i,
  }).locator("form").first();
  await expect(settingEditForm).toBeVisible();
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
