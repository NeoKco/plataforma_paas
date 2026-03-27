import type { TenantFinanceBeneficiaryWriteRequest } from "../services/beneficiariesService";

type BeneficiaryFormProps = {
  value: TenantFinanceBeneficiaryWriteRequest;
  submitLabel: string;
  isSubmitting: boolean;
  onChange: (value: TenantFinanceBeneficiaryWriteRequest) => void;
  onSubmit: () => void;
  onCancel?: () => void;
};

export function BeneficiaryForm({
  value,
  submitLabel,
  isSubmitting,
  onChange,
  onSubmit,
  onCancel,
}: BeneficiaryFormProps) {
  return (
    <form className="finance-form-grid" onSubmit={(event) => { event.preventDefault(); onSubmit(); }}>
      <div>
        <label className="form-label">Nombre</label>
        <input className="form-control" value={value.name} onChange={(event) => onChange({ ...value, name: event.target.value })} />
      </div>
      <div>
        <label className="form-label">Icono</label>
        <input className="form-control" value={value.icon ?? ""} onChange={(event) => onChange({ ...value, icon: event.target.value || null })} />
      </div>
      <div className="finance-form-grid finance-form-grid--full">
        <label className="form-label">Nota</label>
        <textarea className="form-control" rows={3} value={value.note ?? ""} onChange={(event) => onChange({ ...value, note: event.target.value || null })} />
      </div>
      <div className="finance-form-actions">
        <button className="btn btn-primary" type="submit" disabled={isSubmitting}>{submitLabel}</button>
        {onCancel ? <button className="btn btn-outline-secondary" type="button" onClick={onCancel}>Cancelar</button> : null}
      </div>
    </form>
  );
}
