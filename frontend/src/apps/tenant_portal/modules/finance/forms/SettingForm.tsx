import type { TenantFinanceSettingWriteRequest } from "../services/settingsService";
import { useLanguage } from "../../../../../store/language-context";

type SettingFormProps = {
  value: TenantFinanceSettingWriteRequest;
  submitLabel: string;
  isSubmitting: boolean;
  onChange: (value: TenantFinanceSettingWriteRequest) => void;
  onSubmit: () => void;
  onCancel?: () => void;
};

export function SettingForm({
  value,
  submitLabel,
  isSubmitting,
  onChange,
  onSubmit,
  onCancel,
}: SettingFormProps) {
  const { language } = useLanguage();
  return (
    <form className="finance-form-grid" onSubmit={(event) => { event.preventDefault(); onSubmit(); }}>
      <div>
        <label className="form-label">{language === "es" ? "Clave" : "Key"}</label>
        <input className="form-control" value={value.setting_key} onChange={(event) => onChange({ ...value, setting_key: event.target.value })} />
      </div>
      <div className="finance-form-grid finance-form-grid--full">
        <label className="form-label">{language === "es" ? "Valor" : "Value"}</label>
        <textarea className="form-control" rows={4} value={value.setting_value} onChange={(event) => onChange({ ...value, setting_value: event.target.value })} />
      </div>
      <div className="finance-form-actions">
        <button className="btn btn-primary" type="submit" disabled={isSubmitting}>{submitLabel}</button>
        {onCancel ? <button className="btn btn-outline-secondary" type="button" onClick={onCancel}>{language === "es" ? "Cancelar" : "Cancel"}</button> : null}
      </div>
    </form>
  );
}
