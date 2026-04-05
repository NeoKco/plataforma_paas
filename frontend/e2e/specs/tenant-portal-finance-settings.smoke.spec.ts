import { expect, test, type Page } from "../support/test";
import { loginTenant } from "../support/auth";
import { buildE2EText, buildFutureIso } from "../support/e2e-data";
import { e2eEnv } from "../support/env";

const tenantApiBaseUrl = process.env.VITE_API_BASE_URL?.trim() || "http://127.0.0.1:8000";

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

  await ensureFinanceSettingsLoaded(page);
}

async function ensureFinanceSettingsLoaded(page: Page) {
  const loadError = page.getByRole("heading", {
    name: /No se pudo cargar la configuración financiera|Could not load financial settings/i,
  });

  for (let attempt = 0; attempt < 3; attempt += 1) {
    if ((await loadError.count()) === 0) {
      return;
    }

    await page.getByRole("button", { name: /Recargar|Reload/i }).click();
    await page.waitForLoadState("networkidle");
  }

  await expect(loadError).toHaveCount(0);
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

async function createExchangeRateViaApi(
  request: Parameters<Parameters<typeof test>[0]>[0]["request"],
  options: {
    sourceCurrencyCode: string;
    targetCurrencyCode: string;
    exchangeRateValue: string;
    effectiveAt: string;
    sourceLabel: string;
  }
) {
  const loginResponse = await request.post(`${tenantApiBaseUrl}/tenant/auth/login`, {
    data: {
      tenant_slug: e2eEnv.tenant.slug,
      email: e2eEnv.tenant.email,
      password: e2eEnv.tenant.password,
    },
  });
  expect(loginResponse.ok()).toBeTruthy();
  const loginPayload = (await loginResponse.json()) as { access_token: string };

  const currenciesResponse = await request.get(
    `${tenantApiBaseUrl}/tenant/finance/currencies?include_inactive=true`,
    {
      headers: {
        Authorization: `Bearer ${loginPayload.access_token}`,
      },
    }
  );
  expect(currenciesResponse.ok()).toBeTruthy();
  const currenciesPayload = (await currenciesResponse.json()) as {
    data: Array<{ id: number; code: string; is_active: boolean }>;
  };

  const sourceCurrency = currenciesPayload.data.find(
    (currency) => currency.code === options.sourceCurrencyCode && currency.is_active
  );
  const targetCurrency = currenciesPayload.data.find(
    (currency) => currency.code === options.targetCurrencyCode && currency.is_active
  );

  expect(sourceCurrency).toBeTruthy();
  expect(targetCurrency).toBeTruthy();

  const exchangeRateResponse = await request.post(
    `${tenantApiBaseUrl}/tenant/finance/currencies/exchange-rates`,
    {
      headers: {
        Authorization: `Bearer ${loginPayload.access_token}`,
      },
      data: {
        source_currency_id: sourceCurrency!.id,
        target_currency_id: targetCurrency!.id,
        rate: Number.parseFloat(options.exchangeRateValue),
        effective_at: options.effectiveAt,
        source: options.sourceLabel,
        note: null,
      },
    }
  );

  if (!exchangeRateResponse.ok()) {
    throw new Error(
      `Exchange rate API failed with ${exchangeRateResponse.status()}: ${await exchangeRateResponse.text()}`
    );
  }

  return {
    sourceCurrencyCode: sourceCurrency!.code,
    targetCurrencyCode: targetCurrency!.code,
  };
}

test("tenant portal finance settings manages currencies, exchange rates and parameters", async ({
  page,
  request,
}) => {
  const currencySeed = buildE2EText("finance-settings-currency", "id");
  const currencyDigits = currencySeed.replace(/\D/g, "").slice(-6).padStart(6, "7");
  const currencyCode = `XZ${currencyDigits.slice(-4)}`;
  const currencyName = buildE2EText("finance-settings-currency-name", "e2e-finance-currency");
  const settingKey = buildE2EText("finance-settings-key", "e2e.setting").replace(/-/g, ".");
  const settingValue = buildE2EText("finance-settings-value", "valor inicial");
  const updatedSettingValue = buildE2EText("finance-settings-updated", "valor editado");
  const exchangeRateValue = `7.${currencyDigits}`;
  const exchangeRateEffectiveAt = buildFutureIso(1);
  const exchangeRateSource = `manual-${currencyDigits}`;

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
  await ensureFinanceSettingsLoaded(page);

  await page.getByRole("button", { name: /Tipos de cambio|Exchange rates/i }).click();
  await ensureFinanceSettingsLoaded(page);
  const { sourceCurrencyCode, targetCurrencyCode } = await createExchangeRateViaApi(request, {
    sourceCurrencyCode: "USD",
    targetCurrencyCode: "CLP",
    exchangeRateValue,
    effectiveAt: exchangeRateEffectiveAt,
    sourceLabel: exchangeRateSource,
  });
  await page.getByRole("button", { name: /Recargar|Reload/i }).click();
  await ensureFinanceSettingsLoaded(page);

  const exchangeRateRow = page
    .locator("tbody tr")
    .filter({ hasText: new RegExp(`${sourceCurrencyCode}\\s*→\\s*${targetCurrencyCode}|${sourceCurrencyCode}`, "i") })
    .filter({ hasText: exchangeRateValue })
    .first();
  await expect.poll(async () => exchangeRateRow.count()).toBeGreaterThan(0);
  await expect(exchangeRateRow).toBeVisible({ timeout: 10000 });

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
