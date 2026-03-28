import type { TenantFinanceAccountWriteRequest } from "../services/accountsService";
import type { TenantFinanceCurrency } from "../services/currenciesService";
import { useLanguage } from "../../../../../store/language-context";
import { getFinanceAccountTypeLabel } from "../utils/presentation";

type AccountFormProps = {
  value: TenantFinanceAccountWriteRequest;
  currencies: TenantFinanceCurrency[];
  parentAccounts: Array<{ id: number; name: string }>;
  submitLabel: string;
  isSubmitting: boolean;
  onChange: (value: TenantFinanceAccountWriteRequest) => void;
  onSubmit: () => void;
  onCancel?: () => void;
};

const ACCOUNT_TYPES = ["cash", "bank", "card", "savings", "investment", "credit", "other"];

export function AccountForm({
  value,
  currencies,
  parentAccounts,
  submitLabel,
  isSubmitting,
  onChange,
  onSubmit,
  onCancel,
}: AccountFormProps) {
  const { language } = useLanguage();
  return (
    <form
      className="finance-form-grid"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div>
        <label className="form-label">{language === "es" ? "Nombre" : "Name"}</label>
        <input
          className="form-control"
          value={value.name}
          onChange={(event) => onChange({ ...value, name: event.target.value })}
        />
      </div>
      <div>
        <label className="form-label">{language === "es" ? "Código" : "Code"}</label>
        <input
          className="form-control"
          value={value.code ?? ""}
          onChange={(event) => onChange({ ...value, code: event.target.value || null })}
        />
      </div>
      <div>
        <label className="form-label">{language === "es" ? "Tipo" : "Type"}</label>
        <select
          className="form-select"
          value={value.account_type}
          onChange={(event) => onChange({ ...value, account_type: event.target.value })}
        >
          {ACCOUNT_TYPES.map((accountType) => (
            <option key={accountType} value={accountType}>
              {getFinanceAccountTypeLabel(accountType, language)}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="form-label">{language === "es" ? "Moneda" : "Currency"}</label>
        <select
          className="form-select"
          value={value.currency_id}
          onChange={(event) =>
            onChange({ ...value, currency_id: Number.parseInt(event.target.value, 10) })
          }
        >
          {currencies.map((currency) => (
            <option key={currency.id} value={currency.id}>
              {currency.code} · {currency.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="form-label">
          {language === "es" ? "Cuenta padre" : "Parent account"}
        </label>
        <select
          className="form-select"
          value={value.parent_account_id ?? ""}
          onChange={(event) =>
            onChange({
              ...value,
              parent_account_id: event.target.value
                ? Number.parseInt(event.target.value, 10)
                : null,
            })
          }
        >
          <option value="">
            {language === "es" ? "Sin cuenta padre" : "No parent account"}
          </option>
          {parentAccounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="form-label">
          {language === "es" ? "Saldo inicial" : "Opening balance"}
        </label>
        <input
          className="form-control"
          type="number"
          step="0.01"
          value={value.opening_balance}
          onChange={(event) =>
            onChange({ ...value, opening_balance: Number.parseFloat(event.target.value || "0") })
          }
        />
      </div>
      <div>
        <label className="form-label">{language === "es" ? "Orden" : "Sort order"}</label>
        <input
          className="form-control"
          type="number"
          value={value.sort_order}
          onChange={(event) =>
            onChange({ ...value, sort_order: Number.parseInt(event.target.value || "100", 10) })
          }
        />
      </div>
      <div className="finance-form-grid finance-form-grid--full">
        <div className="form-check">
          <input
            id="finance-account-favorite"
            className="form-check-input"
            type="checkbox"
            checked={value.is_favorite}
            onChange={(event) => onChange({ ...value, is_favorite: event.target.checked })}
          />
          <label className="form-check-label" htmlFor="finance-account-favorite">
            {language === "es" ? "Favorita" : "Favorite"}
          </label>
        </div>
        <div className="form-check">
          <input
            id="finance-account-hidden"
            className="form-check-input"
            type="checkbox"
            checked={value.is_balance_hidden}
            onChange={(event) =>
              onChange({ ...value, is_balance_hidden: event.target.checked })
            }
          />
          <label className="form-check-label" htmlFor="finance-account-hidden">
            {language === "es" ? "Ocultar saldo" : "Hide balance"}
          </label>
        </div>
      </div>
      <div className="finance-form-actions">
        <button className="btn btn-primary" type="submit" disabled={isSubmitting}>
          {submitLabel}
        </button>
        {onCancel ? (
          <button className="btn btn-outline-secondary" type="button" onClick={onCancel}>
            {language === "es" ? "Cancelar" : "Cancel"}
          </button>
        ) : null}
      </div>
    </form>
  );
}
