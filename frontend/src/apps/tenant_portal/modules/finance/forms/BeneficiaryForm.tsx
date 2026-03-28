import type { TenantFinanceBeneficiaryWriteRequest } from "../services/beneficiariesService";
import {
  AppForm,
  AppFormActions,
  AppFormField,
} from "../../../../../design-system/AppForm";
import { useLanguage } from "../../../../../store/language-context";

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
      <AppFormField label={language === "es" ? "Ícono" : "Icon"}>
        <input
          className="form-control"
          value={value.icon ?? ""}
          onChange={(event) => onChange({ ...value, icon: event.target.value || null })}
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
