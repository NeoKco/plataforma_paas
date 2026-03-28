import type { TenantFinanceTagWriteRequest } from "../services/tagsService";
import { useLanguage } from "../../../../../store/language-context";

type TagFormProps = {
  value: TenantFinanceTagWriteRequest;
  submitLabel: string;
  isSubmitting: boolean;
  onChange: (value: TenantFinanceTagWriteRequest) => void;
  onSubmit: () => void;
  onCancel?: () => void;
};

export function TagForm({
  value,
  submitLabel,
  isSubmitting,
  onChange,
  onSubmit,
  onCancel,
}: TagFormProps) {
  const { language } = useLanguage();

  return (
    <form className="finance-form-grid" onSubmit={(event) => { event.preventDefault(); onSubmit(); }}>
      <div>
        <label className="form-label">{language === "es" ? "Nombre" : "Name"}</label>
        <input className="form-control" value={value.name} onChange={(event) => onChange({ ...value, name: event.target.value })} />
      </div>
      <div>
        <label className="form-label">{language === "es" ? "Color" : "Color"}</label>
        <input className="form-control" value={value.color ?? ""} onChange={(event) => onChange({ ...value, color: event.target.value || null })} placeholder="#198754" />
      </div>
      <div className="finance-form-actions">
        <button className="btn btn-primary" type="submit" disabled={isSubmitting}>{submitLabel}</button>
        {onCancel ? <button className="btn btn-outline-secondary" type="button" onClick={onCancel}>{language === "es" ? "Cancelar" : "Cancel"}</button> : null}
      </div>
    </form>
  );
}
