import { useEffect, useState } from "react";
import { PageHeader } from "../../../../../components/common/PageHeader";
import { PanelCard } from "../../../../../components/common/PanelCard";
import { DataTableCard } from "../../../../../components/data-display/DataTableCard";
import { ErrorState } from "../../../../../components/feedback/ErrorState";
import { LoadingBlock } from "../../../../../components/feedback/LoadingBlock";
import { getApiErrorDisplayMessage } from "../../../../../services/api";
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
        title="Configuración financiera"
        description="Administra monedas, tipos de cambio y parámetros base del módulo."
        actions={
          <>
            <button className="btn btn-outline-secondary" type="button" onClick={() => void loadData()}>
              Recargar
            </button>
            <button className="btn btn-primary" type="button" onClick={resetForms}>
              Nuevo registro
            </button>
          </>
        }
      />
      <FinanceModuleNav />
      {feedback ? <div className="alert alert-success mb-0">{feedback}</div> : null}
      {error ? (
        <ErrorState
          title="No se pudo cargar la configuración financiera"
          detail={getApiErrorDisplayMessage(error)}
          requestId={error.payload?.request_id}
        />
      ) : null}
      {isLoading ? <LoadingBlock label="Cargando configuración financiera..." /> : null}

      <div className="finance-tab-strip">
        {[
          ["currencies", "Monedas"],
          ["exchangeRates", "Tipos de cambio"],
          ["settings", "Parámetros"],
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
          title="Alta o edición"
          subtitle="Mantén la configuración base que usará el módulo financiero."
        >
          {activeTab === "currencies" ? (
            <CurrencyForm
              value={currencyForm}
              submitLabel={editingId ? "Guardar cambios" : "Crear moneda"}
              isSubmitting={isSubmitting}
              onChange={setCurrencyForm}
              onSubmit={submitCurrent}
              onCancel={editingId ? resetForms : undefined}
            />
          ) : activeTab === "exchangeRates" ? (
            <ExchangeRateForm
              value={exchangeRateForm}
              currencies={currencies}
              submitLabel="Crear tipo de cambio"
              isSubmitting={isSubmitting}
              onChange={setExchangeRateForm}
              onSubmit={submitCurrent}
            />
          ) : (
            <SettingForm
              value={settingForm}
              submitLabel={editingId ? "Guardar cambios" : "Crear parámetro"}
              isSubmitting={isSubmitting}
              onChange={setSettingForm}
              onSubmit={submitCurrent}
              onCancel={editingId ? resetForms : undefined}
            />
          )}
        </PanelCard>

        {activeTab === "currencies" ? (
          <DataTableCard
            title="Configuración vigente"
            subtitle="Monedas disponibles para el tenant y estado de activación."
            rows={currencies}
            columns={[
              {
                key: "name",
                header: "Moneda",
                render: (currency: TenantFinanceCurrency) => (
                  <div>
                    <div className="fw-semibold">{currency.code}</div>
                    <div className="text-secondary small">{currency.name}</div>
                  </div>
                ),
              },
              {
                key: "base",
                header: "Base",
                render: (currency: TenantFinanceCurrency) => (currency.is_base ? "sí" : "no"),
              },
              {
                key: "status",
                header: "Estado",
                render: (currency: TenantFinanceCurrency) => (
                  <span
                    className={`finance-status-pill${currency.is_active ? " is-active" : " is-inactive"}`}
                  >
                    {currency.is_active ? "activa" : "inactiva"}
                  </span>
                ),
              },
              {
                key: "actions",
                header: "Acciones",
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
                      Editar
                    </button>
                    <button
                      className="btn btn-sm btn-outline-secondary"
                      type="button"
                      onClick={() => void toggleCurrency(currency)}
                    >
                      {currency.is_active ? "Desactivar" : "Activar"}
                    </button>
                  </div>
                ),
              },
            ]}
          />
        ) : null}

        {activeTab === "exchangeRates" ? (
          <DataTableCard
            title="Configuración vigente"
            subtitle="Histórico simple de tipos de cambio cargados manualmente."
            rows={exchangeRates}
            columns={[
              {
                key: "pair",
                header: "Par",
                render: (rate: TenantFinanceExchangeRate) =>
                  `${currencies.find((currency) => currency.id === rate.source_currency_id)?.code || rate.source_currency_id} → ${currencies.find((currency) => currency.id === rate.target_currency_id)?.code || rate.target_currency_id}`,
              },
              {
                key: "rate",
                header: "Tasa",
                render: (rate: TenantFinanceExchangeRate) => rate.rate,
              },
              {
                key: "effective",
                header: "Fecha efectiva",
                render: (rate: TenantFinanceExchangeRate) => rate.effective_at,
              },
            ]}
          />
        ) : null}

        {activeTab === "settings" ? (
          <DataTableCard
            title="Configuración vigente"
            subtitle="Parámetros simples del módulo financiero."
            rows={settings}
            columns={[
              {
                key: "setting",
                header: "Clave",
                render: (setting: TenantFinanceSetting) => (
                  <div>
                    <div className="fw-semibold">{setting.setting_key}</div>
                    <div className="text-secondary small">{setting.setting_value}</div>
                  </div>
                ),
              },
              {
                key: "status",
                header: "Estado",
                render: (setting: TenantFinanceSetting) => (
                  <span
                    className={`finance-status-pill${setting.is_active ? " is-active" : " is-inactive"}`}
                  >
                    {setting.is_active ? "activo" : "inactivo"}
                  </span>
                ),
              },
              {
                key: "actions",
                header: "Acciones",
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
                      Editar
                    </button>
                    <button
                      className="btn btn-sm btn-outline-secondary"
                      type="button"
                      onClick={() => void toggleSetting(setting)}
                    >
                      {setting.is_active ? "Desactivar" : "Activar"}
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
