import type { TenantFinanceTagWriteRequest } from "../services/tagsService";
import {
  AppForm,
  AppFormActions,
  AppFormField,
} from "../../../../../design-system/AppForm";
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
      <AppFormField label={language === "es" ? "Color" : "Color"}>
        <input
          className="form-control"
          value={value.color ?? ""}
          onChange={(event) => onChange({ ...value, color: event.target.value || null })}
          placeholder="#198754"
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
