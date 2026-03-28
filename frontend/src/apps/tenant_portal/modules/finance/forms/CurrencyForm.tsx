import type {
  TenantFinanceCurrencyWriteRequest,
  TenantFinanceExchangeRateWriteRequest,
  TenantFinanceCurrency,
} from "../services/currenciesService";
import {
  AppCheckGrid,
  AppForm,
  AppFormActions,
  AppFormField,
} from "../../../../../design-system/AppForm";
import { useLanguage } from "../../../../../store/language-context";

type CurrencyFormProps = {
  value: TenantFinanceCurrencyWriteRequest;
  submitLabel: string;
  isSubmitting: boolean;
  onChange: (value: TenantFinanceCurrencyWriteRequest) => void;
  onSubmit: () => void;
  onCancel?: () => void;
};

export function CurrencyForm({
  value,
  submitLabel,
  isSubmitting,
  onChange,
  onSubmit,
  onCancel,
}: CurrencyFormProps) {
  const { language } = useLanguage();
  return (
    <AppForm
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <AppFormField label={language === "es" ? "Código" : "Code"}>
        <input
          className="form-control"
          value={value.code}
          onChange={(event) => onChange({ ...value, code: event.target.value })}
        />
      </AppFormField>
      <AppFormField label={language === "es" ? "Nombre" : "Name"}>
        <input
          className="form-control"
          value={value.name}
          onChange={(event) => onChange({ ...value, name: event.target.value })}
        />
      </AppFormField>
      <AppFormField label={language === "es" ? "Símbolo" : "Symbol"}>
        <input
          className="form-control"
          value={value.symbol}
          onChange={(event) => onChange({ ...value, symbol: event.target.value })}
        />
      </AppFormField>
      <AppFormField label={language === "es" ? "Decimales" : "Decimals"}>
        <input
          className="form-control"
          type="number"
          value={value.decimal_places}
          onChange={(event) =>
            onChange({ ...value, decimal_places: Number.parseInt(event.target.value || "0", 10) })
          }
        />
      </AppFormField>
      <AppFormField fullWidth>
        <AppCheckGrid>
          <div className="form-check">
            <input
              id="finance-currency-base"
              className="form-check-input"
              type="checkbox"
              checked={value.is_base}
              onChange={(event) => onChange({ ...value, is_base: event.target.checked })}
            />
            <label className="form-check-label" htmlFor="finance-currency-base">
              {language === "es" ? "Moneda base" : "Base currency"}
            </label>
          </div>
        </AppCheckGrid>
      </AppFormField>
      <AppFormActions>
        <button className="btn btn-primary" type="submit" disabled={isSubmitting}>
          {submitLabel}
        </button>
        {onCancel ? (
          <button className="btn btn-outline-secondary" type="button" onClick={onCancel}>
            {language === "es" ? "Cancelar" : "Cancel"}
          </button>
        ) : null}
      </AppFormActions>
    </AppForm>
  );
}

type ExchangeRateFormProps = {
  value: TenantFinanceExchangeRateWriteRequest;
  currencies: TenantFinanceCurrency[];
  submitLabel: string;
  isSubmitting: boolean;
  onChange: (value: TenantFinanceExchangeRateWriteRequest) => void;
  onSubmit: () => void;
  onCancel?: () => void;
};

export function ExchangeRateForm({
  value,
  currencies,
  submitLabel,
  isSubmitting,
  onChange,
  onSubmit,
  onCancel,
}: ExchangeRateFormProps) {
  const { language } = useLanguage();
  return (
    <AppForm
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <AppFormField label={language === "es" ? "Moneda origen" : "Source currency"}>
        <select
          className="form-select"
          value={value.source_currency_id}
          onChange={(event) =>
            onChange({ ...value, source_currency_id: Number.parseInt(event.target.value, 10) })
          }
        >
          {currencies.map((currency) => (
            <option key={currency.id} value={currency.id}>
              {currency.code}
            </option>
          ))}
        </select>
      </AppFormField>
      <AppFormField label={language === "es" ? "Moneda destino" : "Target currency"}>
        <select
          className="form-select"
          value={value.target_currency_id}
          onChange={(event) =>
            onChange({ ...value, target_currency_id: Number.parseInt(event.target.value, 10) })
          }
        >
          {currencies.map((currency) => (
            <option key={currency.id} value={currency.id}>
              {currency.code}
            </option>
          ))}
        </select>
      </AppFormField>
      <AppFormField label={language === "es" ? "Tasa" : "Rate"}>
        <input
          className="form-control"
          type="number"
          step="0.000001"
          value={value.rate}
          onChange={(event) =>
            onChange({ ...value, rate: Number.parseFloat(event.target.value || "0") })
          }
        />
      </AppFormField>
      <AppFormField label={language === "es" ? "Fecha efectiva" : "Effective date"}>
        <input
          className="form-control"
          type="datetime-local"
          value={value.effective_at}
          onChange={(event) => onChange({ ...value, effective_at: event.target.value })}
        />
      </AppFormField>
      <AppFormField label={language === "es" ? "Fuente" : "Source"} fullWidth>
        <input
          className="form-control"
          value={value.source ?? ""}
          onChange={(event) => onChange({ ...value, source: event.target.value || null })}
        />
      </AppFormField>
      <AppFormActions>
        <button className="btn btn-primary" type="submit" disabled={isSubmitting}>
          {submitLabel}
        </button>
        {onCancel ? (
          <button className="btn btn-outline-secondary" type="button" onClick={onCancel}>
            {language === "es" ? "Cancelar" : "Cancel"}
          </button>
        ) : null}
      </AppFormActions>
    </AppForm>
  );
}
