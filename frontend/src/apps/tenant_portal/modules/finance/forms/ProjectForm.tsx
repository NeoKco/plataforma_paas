import type { TenantFinanceProjectWriteRequest } from "../services/projectsService";

type ProjectFormProps = {
  value: TenantFinanceProjectWriteRequest;
  submitLabel: string;
  isSubmitting: boolean;
  onChange: (value: TenantFinanceProjectWriteRequest) => void;
  onSubmit: () => void;
  onCancel?: () => void;
};

export function ProjectForm({
  value,
  submitLabel,
  isSubmitting,
  onChange,
  onSubmit,
  onCancel,
}: ProjectFormProps) {
  return (
    <form className="finance-form-grid" onSubmit={(event) => { event.preventDefault(); onSubmit(); }}>
      <div>
        <label className="form-label">Nombre</label>
        <input className="form-control" value={value.name} onChange={(event) => onChange({ ...value, name: event.target.value })} />
      </div>
      <div>
        <label className="form-label">Código</label>
        <input className="form-control" value={value.code ?? ""} onChange={(event) => onChange({ ...value, code: event.target.value || null })} />
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
