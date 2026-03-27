import type { TenantFinanceCategoryWriteRequest, TenantFinanceCategory } from "../services/categoriesService";

type CategoryFormProps = {
  value: TenantFinanceCategoryWriteRequest;
  categories: TenantFinanceCategory[];
  submitLabel: string;
  isSubmitting: boolean;
  onChange: (value: TenantFinanceCategoryWriteRequest) => void;
  onSubmit: () => void;
  onCancel?: () => void;
};

const CATEGORY_TYPES = ["income", "expense", "transfer"];

export function CategoryForm({
  value,
  categories,
  submitLabel,
  isSubmitting,
  onChange,
  onSubmit,
  onCancel,
}: CategoryFormProps) {
  const parentOptions = categories.filter(
    (category) => category.category_type === value.category_type
  );

  return (
    <form
      className="finance-form-grid"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div>
        <label className="form-label">Nombre</label>
        <input
          className="form-control"
          value={value.name}
          onChange={(event) => onChange({ ...value, name: event.target.value })}
        />
      </div>
      <div>
        <label className="form-label">Tipo</label>
        <select
          className="form-select"
          value={value.category_type}
          onChange={(event) => onChange({ ...value, category_type: event.target.value })}
        >
          {CATEGORY_TYPES.map((categoryType) => (
            <option key={categoryType} value={categoryType}>
              {categoryType}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="form-label">Categoría padre</label>
        <select
          className="form-select"
          value={value.parent_category_id ?? ""}
          onChange={(event) =>
            onChange({
              ...value,
              parent_category_id: event.target.value
                ? Number.parseInt(event.target.value, 10)
                : null,
            })
          }
        >
          <option value="">Sin categoría padre</option>
          {parentOptions.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="form-label">Color</label>
        <input
          className="form-control"
          value={value.color ?? ""}
          onChange={(event) => onChange({ ...value, color: event.target.value || null })}
          placeholder="#0d6efd"
        />
      </div>
      <div className="finance-form-grid finance-form-grid--full">
        <label className="form-label">Nota</label>
        <textarea
          className="form-control"
          rows={3}
          value={value.note ?? ""}
          onChange={(event) => onChange({ ...value, note: event.target.value || null })}
        />
      </div>
      <div className="finance-form-actions">
        <button className="btn btn-primary" type="submit" disabled={isSubmitting}>
          {submitLabel}
        </button>
        {onCancel ? (
          <button className="btn btn-outline-secondary" type="button" onClick={onCancel}>
            Cancelar
          </button>
        ) : null}
      </div>
    </form>
  );
}
