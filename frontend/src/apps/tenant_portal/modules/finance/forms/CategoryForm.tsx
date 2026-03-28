import type { TenantFinanceCategoryWriteRequest, TenantFinanceCategory } from "../services/categoriesService";
import {
  AppForm,
  AppFormActions,
  AppFormField,
} from "../../../../../design-system/AppForm";
import { useLanguage } from "../../../../../store/language-context";
import { getFinanceCategoryTypeLabel } from "../utils/presentation";

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
  const { language } = useLanguage();
  const parentOptions = categories.filter(
    (category) => category.category_type === value.category_type
  );

  return (
    <AppForm
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <AppFormField label={language === "es" ? "Nombre" : "Name"}>
        <input
          className="form-control"
          value={value.name}
          onChange={(event) => onChange({ ...value, name: event.target.value })}
        />
      </AppFormField>
      <AppFormField label={language === "es" ? "Tipo" : "Type"}>
        <select
          className="form-select"
          value={value.category_type}
          onChange={(event) => onChange({ ...value, category_type: event.target.value })}
        >
          {CATEGORY_TYPES.map((categoryType) => (
            <option key={categoryType} value={categoryType}>
              {getFinanceCategoryTypeLabel(categoryType, language)}
            </option>
          ))}
        </select>
      </AppFormField>
      <AppFormField label={language === "es" ? "Categoría padre" : "Parent category"}>
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
          <option value="">
            {language === "es" ? "Sin categoría padre" : "No parent category"}
          </option>
          {parentOptions.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </AppFormField>
      <AppFormField label={language === "es" ? "Color" : "Color"}>
        <input
          className="form-control"
          value={value.color ?? ""}
          onChange={(event) => onChange({ ...value, color: event.target.value || null })}
          placeholder="#0d6efd"
        />
      </AppFormField>
      <AppFormField label={language === "es" ? "Nota" : "Note"} fullWidth>
        <textarea
          className="form-control"
          rows={3}
          value={value.note ?? ""}
          onChange={(event) => onChange({ ...value, note: event.target.value || null })}
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
