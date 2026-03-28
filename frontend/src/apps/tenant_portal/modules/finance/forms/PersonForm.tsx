import type { TenantFinancePersonWriteRequest } from "../services/peopleService";
import { useLanguage } from "../../../../../store/language-context";

type PersonFormProps = {
  value: TenantFinancePersonWriteRequest;
  submitLabel: string;
  isSubmitting: boolean;
  onChange: (value: TenantFinancePersonWriteRequest) => void;
  onSubmit: () => void;
  onCancel?: () => void;
};

export function PersonForm({
  value,
  submitLabel,
  isSubmitting,
  onChange,
  onSubmit,
  onCancel,
}: PersonFormProps) {
  const { language } = useLanguage();

  return (
    <form className="finance-form-grid" onSubmit={(event) => { event.preventDefault(); onSubmit(); }}>
      <div>
        <label className="form-label">{language === "es" ? "Nombre" : "Name"}</label>
        <input className="form-control" value={value.name} onChange={(event) => onChange({ ...value, name: event.target.value })} />
      </div>
      <div>
        <label className="form-label">{language === "es" ? "Ícono" : "Icon"}</label>
        <input className="form-control" value={value.icon ?? ""} onChange={(event) => onChange({ ...value, icon: event.target.value || null })} />
      </div>
      <div className="finance-form-grid finance-form-grid--full">
        <label className="form-label">{language === "es" ? "Nota" : "Note"}</label>
        <textarea className="form-control" rows={3} value={value.note ?? ""} onChange={(event) => onChange({ ...value, note: event.target.value || null })} />
      </div>
      <div className="finance-form-actions">
        <button className="btn btn-primary" type="submit" disabled={isSubmitting}>{submitLabel}</button>
        {onCancel ? <button className="btn btn-outline-secondary" type="button" onClick={onCancel}>{language === "es" ? "Cancelar" : "Cancel"}</button> : null}
      </div>
    </form>
  );
}
