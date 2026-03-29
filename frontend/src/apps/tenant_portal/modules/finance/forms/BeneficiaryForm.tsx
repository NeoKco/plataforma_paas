import type { TenantFinanceBeneficiaryWriteRequest } from "../services/beneficiariesService";
import {
  AppForm,
  AppFormActions,
  AppFormField,
} from "../../../../../design-system/AppForm";
import { useLanguage } from "../../../../../store/language-context";
import { FinanceNamedIconPicker } from "../components/common/FinanceNamedIconPicker";
import {
  FINANCE_ENTITY_ICON_OPTIONS,
  getFinanceEntityIconLabel,
  getFinanceEntityIconName,
  isFinanceEntityIconName,
} from "../utils/entityIcons";

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
      <AppFormField label={language === "es" ? "Ícono" : "Icon"} fullWidth>
        <FinanceNamedIconPicker
          options={FINANCE_ENTITY_ICON_OPTIONS}
          value={value.icon}
          onChange={(icon) => onChange({ ...value, icon })}
          fallbackIcon={getFinanceEntityIconName(value.icon)}
          helperText={{
            es: "Asigna un icono semántico al tercero o beneficiario para distinguirlo mejor.",
            en: "Assign a semantic icon to the beneficiary or third party to distinguish it better.",
          }}
          getDisplayLabel={getFinanceEntityIconLabel}
          isKnownValue={isFinanceEntityIconName}
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
