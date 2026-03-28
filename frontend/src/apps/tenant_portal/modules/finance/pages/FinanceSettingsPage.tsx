import { useEffect, useState } from "react";
import { PageHeader } from "../../../../../components/common/PageHeader";
import { PanelCard } from "../../../../../components/common/PanelCard";
import { DataTableCard } from "../../../../../components/data-display/DataTableCard";
import { ErrorState } from "../../../../../components/feedback/ErrorState";
import { LoadingBlock } from "../../../../../components/feedback/LoadingBlock";
import { getApiErrorDisplayMessage } from "../../../../../services/api";
import { useLanguage } from "../../../../../store/language-context";
import { useTenantAuth } from "../../../../../store/tenant-auth-context";
import type { ApiError } from "../../../../../types";
import { FinanceModuleNav } from "../components/common/FinanceModuleNav";
import { CurrencyForm, ExchangeRateForm } from "../forms/CurrencyForm";
import { SettingForm } from "../forms/SettingForm";
import {
  createTenantFinanceCurrency,
  createTenantFinanceExchangeRate,
  getTenantFinanceCurrencies,
  getTenantFinanceExchangeRates,
  updateTenantFinanceCurrency,
  updateTenantFinanceCurrencyStatus,
  type TenantFinanceCurrency,
  type TenantFinanceCurrencyWriteRequest,
  type TenantFinanceExchangeRate,
  type TenantFinanceExchangeRateWriteRequest,
} from "../services/currenciesService";
import {
  createTenantFinanceSetting,
  getTenantFinanceSettings,
  updateTenantFinanceSetting,
  updateTenantFinanceSettingStatus,
  type TenantFinanceSetting,
  type TenantFinanceSettingWriteRequest,
} from "../services/settingsService";
import { getActiveStateLabel, getBooleanLabel, getSimpleStateLabel } from "../utils/presentation";

type SettingsTab = "currencies" | "exchangeRates" | "settings";

function buildCurrencyForm(): TenantFinanceCurrencyWriteRequest {
  return {
    code: "",
    name: "",
    symbol: "",
    decimal_places: 2,
    is_base: false,
    is_active: true,
    sort_order: 100,
  };
}

function buildExchangeRateForm(currencyId: number | null): TenantFinanceExchangeRateWriteRequest {
  return {
    source_currency_id: currencyId ?? 0,
    target_currency_id: currencyId ?? 0,
    rate: 1,
    effective_at: new Date().toISOString().slice(0, 16),
    source: "manual",
    note: null,
  };
}

function buildSettingForm(): TenantFinanceSettingWriteRequest {
  return { setting_key: "", setting_value: "", is_active: true };
}

export function FinanceSettingsPage() {
  const { session } = useTenantAuth();
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState<SettingsTab>("currencies");
  const [currencies, setCurrencies] = useState<TenantFinanceCurrency[]>([]);
  const [exchangeRates, setExchangeRates] = useState<TenantFinanceExchangeRate[]>([]);
  const [settings, setSettings] = useState<TenantFinanceSetting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [currencyForm, setCurrencyForm] = useState<TenantFinanceCurrencyWriteRequest>(buildCurrencyForm());
  const [exchangeRateForm, setExchangeRateForm] = useState<TenantFinanceExchangeRateWriteRequest>(buildExchangeRateForm(null));
  const [settingForm, setSettingForm] = useState<TenantFinanceSettingWriteRequest>(buildSettingForm());
  const baseCurrency = currencies.find((currency) => currency.is_base) || null;

  async function loadData() {
    if (!session?.accessToken) {
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const [currenciesResponse, exchangeRatesResponse, settingsResponse] = await Promise.all([
        getTenantFinanceCurrencies(session.accessToken),
        getTenantFinanceExchangeRates(session.accessToken),
        getTenantFinanceSettings(session.accessToken),
      ]);
      setCurrencies(currenciesResponse.data);
      setExchangeRates(exchangeRatesResponse.data);
      setSettings(settingsResponse.data);
      const fallbackSource = currenciesResponse.data[0]?.id ?? 0;
      const fallbackTarget = currenciesResponse.data[1]?.id ?? fallbackSource;
      setExchangeRateForm((current) => ({
        ...current,
        source_currency_id: current.source_currency_id || fallbackSource,
        target_currency_id: current.target_currency_id || fallbackTarget,
      }));
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [session?.accessToken]);

  function resetForms() {
    setEditingId(null);
    setError(null);
    setCurrencyForm(buildCurrencyForm());
    setExchangeRateForm({
      source_currency_id: currencies[0]?.id ?? 0,
      target_currency_id: currencies[1]?.id ?? currencies[0]?.id ?? 0,
      rate: 1,
      effective_at: new Date().toISOString().slice(0, 16),
      source: "manual",
      note: null,
    });
    setSettingForm(buildSettingForm());
  }

  async function submitCurrent() {
    if (!session?.accessToken) {
      return;
    }
    setIsSubmitting(true);
    setError(null);
    setFeedback(null);
    try {
      let message = "";
      if (activeTab === "currencies") {
        message = editingId
          ? (await updateTenantFinanceCurrency(session.accessToken, editingId, currencyForm)).message
          : (await createTenantFinanceCurrency(session.accessToken, currencyForm)).message;
      } else if (activeTab === "exchangeRates") {
        message = (await createTenantFinanceExchangeRate(session.accessToken, exchangeRateForm)).message;
      } else {
        message = editingId
          ? (await updateTenantFinanceSetting(session.accessToken, editingId, settingForm)).message
          : (await createTenantFinanceSetting(session.accessToken, settingForm)).message;
      }
      setFeedback(message);
      resetForms();
      await loadData();
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function toggleSetting(setting: TenantFinanceSetting) {
    if (!session?.accessToken) {
      return;
    }
    try {
      setError(null);
      const response = await updateTenantFinanceSettingStatus(
        session.accessToken,
        setting.id,
        !setting.is_active
      );
      setFeedback(response.message);
      await loadData();
    } catch (rawError) {
      setError(rawError as ApiError);
    }
  }

  async function toggleCurrency(currency: TenantFinanceCurrency) {
    if (!session?.accessToken) {
      return;
    }
    try {
      setError(null);
      const response = await updateTenantFinanceCurrencyStatus(
        session.accessToken,
        currency.id,
        !currency.is_active
      );
      setFeedback(response.message);
      await loadData();
    } catch (rawError) {
      setError(rawError as ApiError);
    }
  }

  return (
    <div className="d-grid gap-4">
      <PageHeader
        eyebrow="Finance"
        title={language === "es" ? "Configuración financiera" : "Financial settings"}
        description={
          language === "es"
            ? "Administra monedas, tipos de cambio y parámetros base del módulo."
            : "Manage currencies, exchange rates, and base module settings."
        }
        actions={
          <>
            <button className="btn btn-outline-secondary" type="button" onClick={() => void loadData()}>
              {language === "es" ? "Recargar" : "Reload"}
            </button>
            <button className="btn btn-primary" type="button" onClick={resetForms}>
              {language === "es" ? "Nuevo registro" : "New record"}
            </button>
          </>
        }
      />
      <FinanceModuleNav />
      {feedback ? <div className="alert alert-success mb-0">{feedback}</div> : null}
      {error ? (
        <ErrorState
          title={
            language === "es"
              ? "No se pudo cargar la configuración financiera"
              : "Financial settings could not be loaded"
          }
          detail={getApiErrorDisplayMessage(error)}
          requestId={error.payload?.request_id}
        />
      ) : null}
      {isLoading ? (
        <LoadingBlock
          label={
            language === "es"
              ? "Cargando configuración financiera..."
              : "Loading financial settings..."
          }
        />
      ) : null}

      <div className="finance-tab-strip">
        {[
          ["currencies", language === "es" ? "Monedas" : "Currencies"],
          ["exchangeRates", language === "es" ? "Tipos de cambio" : "Exchange rates"],
          ["settings", language === "es" ? "Parámetros" : "Parameters"],
        ].map(([key, label]) => (
          <button
            key={key}
            className={`btn btn-sm ${activeTab === key ? "btn-primary" : "btn-outline-primary"}`}
            type="button"
            onClick={() => {
              setActiveTab(key as SettingsTab);
              resetForms();
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="finance-catalog-layout">
        <PanelCard
          title={language === "es" ? "Alta o edición" : "Create or edit"}
          subtitle={
            activeTab === "currencies"
              ? language === "es"
                ? "Mantén monedas del módulo. Para cambiar la moneda base, edita o crea una moneda y marca “Moneda base”; la anterior se desmarca automáticamente."
                : "Manage module currencies. To change the base currency, create or edit a currency and mark “Base currency”; the previous base is cleared automatically."
              : language === "es"
                ? "Mantén la configuración base que usará el módulo financiero."
                : "Maintain the base configuration used by the finance module."
          }
        >
          {activeTab === "currencies" ? (
            <CurrencyForm
              value={currencyForm}
              submitLabel={
                editingId
                  ? language === "es"
                    ? "Guardar cambios"
                    : "Save changes"
                  : language === "es"
                    ? "Crear moneda"
                    : "Create currency"
              }
              isSubmitting={isSubmitting}
              onChange={setCurrencyForm}
              onSubmit={submitCurrent}
              onCancel={editingId ? resetForms : undefined}
            />
          ) : activeTab === "exchangeRates" ? (
            <ExchangeRateForm
              value={exchangeRateForm}
              currencies={currencies}
              submitLabel={language === "es" ? "Crear tipo de cambio" : "Create exchange rate"}
              isSubmitting={isSubmitting}
              onChange={setExchangeRateForm}
              onSubmit={submitCurrent}
            />
          ) : (
            <SettingForm
              value={settingForm}
              submitLabel={
                editingId
                  ? language === "es"
                    ? "Guardar cambios"
                    : "Save changes"
                  : language === "es"
                    ? "Crear parámetro"
                    : "Create parameter"
              }
              isSubmitting={isSubmitting}
              onChange={setSettingForm}
              onSubmit={submitCurrent}
              onCancel={editingId ? resetForms : undefined}
            />
          )}
        </PanelCard>

        {activeTab === "currencies" ? (
          <>
          <div className="tenant-action-feedback tenant-action-feedback--success">
            <strong>{language === "es" ? "Moneda base actual:" : "Current base currency:"}</strong>{" "}
            {baseCurrency ? `${baseCurrency.code} · ${baseCurrency.name}` : language === "es" ? "sin definir" : "not set"}
            <br />
            {language === "es"
              ? "Las transacciones nuevas usan esta moneda como referencia base. Al cambiarla, las transacciones históricas no se recalculan automáticamente."
              : "New transactions use this currency as the base reference. Changing it does not automatically recalculate historical transactions."}
          </div>
          <DataTableCard
            title={language === "es" ? "Configuración vigente" : "Current setup"}
            subtitle={
              language === "es"
                ? "Monedas disponibles para el tenant y estado de activación."
                : "Currencies available for the tenant and their activation status."
            }
            rows={currencies}
            columns={[
              {
                key: "name",
                header: language === "es" ? "Moneda" : "Currency",
                render: (currency: TenantFinanceCurrency) => (
                  <div>
                    <div className="fw-semibold">{currency.code}</div>
                    <div className="text-secondary small">{currency.name}</div>
                  </div>
                ),
              },
              {
                key: "base",
                header: language === "es" ? "Base" : "Base",
                render: (currency: TenantFinanceCurrency) =>
                  getBooleanLabel(currency.is_base, language),
              },
              {
                key: "status",
                header: language === "es" ? "Estado" : "Status",
                render: (currency: TenantFinanceCurrency) => (
                  <span
                    className={`finance-status-pill${currency.is_active ? " is-active" : " is-inactive"}`}
                  >
                    {getActiveStateLabel(currency.is_active, language)}
                  </span>
                ),
              },
              {
                key: "actions",
                header: language === "es" ? "Acciones" : "Actions",
                render: (currency: TenantFinanceCurrency) => (
                  <div className="d-flex gap-2">
                    <button
                      className="btn btn-sm btn-outline-primary"
                      type="button"
                      onClick={() => {
                        setEditingId(currency.id);
                        setCurrencyForm({
                          code: currency.code,
                          name: currency.name,
                          symbol: currency.symbol,
                          decimal_places: currency.decimal_places,
                          is_base: currency.is_base,
                          is_active: currency.is_active,
                          sort_order: currency.sort_order,
                        });
                      }}
                    >
                      {language === "es" ? "Editar" : "Edit"}
                    </button>
                    <button
                      className="btn btn-sm btn-outline-secondary"
                      type="button"
                      onClick={() => void toggleCurrency(currency)}
                    >
                      {currency.is_active
                        ? language === "es"
                          ? "Desactivar"
                          : "Deactivate"
                        : language === "es"
                          ? "Activar"
                          : "Activate"}
                    </button>
                  </div>
                ),
              },
            ]}
          />
          </>
        ) : null}

        {activeTab === "exchangeRates" ? (
          <DataTableCard
            title={language === "es" ? "Configuración vigente" : "Current setup"}
            subtitle={
              language === "es"
                ? "Histórico simple de tipos de cambio cargados manualmente."
                : "Simple history of manually entered exchange rates."
            }
            rows={exchangeRates}
            columns={[
              {
                key: "pair",
                header: language === "es" ? "Par" : "Pair",
                render: (rate: TenantFinanceExchangeRate) =>
                  `${currencies.find((currency) => currency.id === rate.source_currency_id)?.code || rate.source_currency_id} → ${currencies.find((currency) => currency.id === rate.target_currency_id)?.code || rate.target_currency_id}`,
              },
              {
                key: "rate",
                header: language === "es" ? "Tasa" : "Rate",
                render: (rate: TenantFinanceExchangeRate) => rate.rate,
              },
              {
                key: "effective",
                header: language === "es" ? "Fecha efectiva" : "Effective date",
                render: (rate: TenantFinanceExchangeRate) => rate.effective_at,
              },
            ]}
          />
        ) : null}

        {activeTab === "settings" ? (
          <DataTableCard
            title={language === "es" ? "Configuración vigente" : "Current setup"}
            subtitle={
              language === "es"
                ? "Parámetros simples del módulo financiero."
                : "Simple finance module parameters."
            }
            rows={settings}
            columns={[
              {
                key: "setting",
                header: language === "es" ? "Clave" : "Key",
                render: (setting: TenantFinanceSetting) => (
                  <div>
                    <div className="fw-semibold">{setting.setting_key}</div>
                    <div className="text-secondary small">{setting.setting_value}</div>
                  </div>
                ),
              },
              {
                key: "status",
                header: language === "es" ? "Estado" : "Status",
                render: (setting: TenantFinanceSetting) => (
                  <span
                    className={`finance-status-pill${setting.is_active ? " is-active" : " is-inactive"}`}
                  >
                    {getSimpleStateLabel(setting.is_active, language)}
                  </span>
                ),
              },
              {
                key: "actions",
                header: language === "es" ? "Acciones" : "Actions",
                render: (setting: TenantFinanceSetting) => (
                  <div className="d-flex gap-2">
                    <button
                      className="btn btn-sm btn-outline-primary"
                      type="button"
                      onClick={() => {
                        setEditingId(setting.id);
                        setSettingForm({
                          setting_key: setting.setting_key,
                          setting_value: setting.setting_value,
                          is_active: setting.is_active,
                        });
                      }}
                    >
                      {language === "es" ? "Editar" : "Edit"}
                    </button>
                    <button
                      className="btn btn-sm btn-outline-secondary"
                      type="button"
                      onClick={() => void toggleSetting(setting)}
                    >
                      {setting.is_active
                        ? language === "es"
                          ? "Desactivar"
                          : "Deactivate"
                        : language === "es"
                          ? "Activar"
                          : "Activate"}
                    </button>
                  </div>
                ),
              },
            ]}
          />
        ) : null}
      </div>
    </div>
  );
}
