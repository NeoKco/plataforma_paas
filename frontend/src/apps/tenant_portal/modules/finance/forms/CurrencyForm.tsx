import type {
  TenantFinanceCurrencyWriteRequest,
  TenantFinanceExchangeRateWriteRequest,
  TenantFinanceCurrency,
} from "../services/currenciesService";

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
  return (
    <form className="finance-form-grid" onSubmit={(event) => { event.preventDefault(); onSubmit(); }}>
      <div>
        <label className="form-label">Código</label>
        <input className="form-control" value={value.code} onChange={(event) => onChange({ ...value, code: event.target.value })} />
      </div>
      <div>
        <label className="form-label">Nombre</label>
        <input className="form-control" value={value.name} onChange={(event) => onChange({ ...value, name: event.target.value })} />
      </div>
      <div>
        <label className="form-label">Símbolo</label>
        <input className="form-control" value={value.symbol} onChange={(event) => onChange({ ...value, symbol: event.target.value })} />
      </div>
      <div>
        <label className="form-label">Decimales</label>
        <input className="form-control" type="number" value={value.decimal_places} onChange={(event) => onChange({ ...value, decimal_places: Number.parseInt(event.target.value || "0", 10) })} />
      </div>
      <div className="finance-form-grid finance-form-grid--full">
        <div className="form-check">
          <input id="finance-currency-base" className="form-check-input" type="checkbox" checked={value.is_base} onChange={(event) => onChange({ ...value, is_base: event.target.checked })} />
          <label className="form-check-label" htmlFor="finance-currency-base">Moneda base</label>
        </div>
      </div>
      <div className="finance-form-actions">
        <button className="btn btn-primary" type="submit" disabled={isSubmitting}>{submitLabel}</button>
        {onCancel ? <button className="btn btn-outline-secondary" type="button" onClick={onCancel}>Cancelar</button> : null}
      </div>
    </form>
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
  return (
    <form className="finance-form-grid" onSubmit={(event) => { event.preventDefault(); onSubmit(); }}>
      <div>
        <label className="form-label">Moneda origen</label>
        <select className="form-select" value={value.source_currency_id} onChange={(event) => onChange({ ...value, source_currency_id: Number.parseInt(event.target.value, 10) })}>
          {currencies.map((currency) => <option key={currency.id} value={currency.id}>{currency.code}</option>)}
        </select>
      </div>
      <div>
        <label className="form-label">Moneda destino</label>
        <select className="form-select" value={value.target_currency_id} onChange={(event) => onChange({ ...value, target_currency_id: Number.parseInt(event.target.value, 10) })}>
          {currencies.map((currency) => <option key={currency.id} value={currency.id}>{currency.code}</option>)}
        </select>
      </div>
      <div>
        <label className="form-label">Tasa</label>
        <input className="form-control" type="number" step="0.000001" value={value.rate} onChange={(event) => onChange({ ...value, rate: Number.parseFloat(event.target.value || "0") })} />
      </div>
      <div>
        <label className="form-label">Fecha efectiva</label>
        <input className="form-control" type="datetime-local" value={value.effective_at} onChange={(event) => onChange({ ...value, effective_at: event.target.value })} />
      </div>
      <div className="finance-form-grid finance-form-grid--full">
        <label className="form-label">Fuente</label>
        <input className="form-control" value={value.source ?? ""} onChange={(event) => onChange({ ...value, source: event.target.value || null })} />
      </div>
      <div className="finance-form-actions">
        <button className="btn btn-primary" type="submit" disabled={isSubmitting}>{submitLabel}</button>
        {onCancel ? <button className="btn btn-outline-secondary" type="button" onClick={onCancel}>Cancelar</button> : null}
      </div>
    </form>
  );
}
