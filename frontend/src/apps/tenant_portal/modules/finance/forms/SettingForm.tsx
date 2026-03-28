import type { TenantFinanceSettingWriteRequest } from "../services/settingsService";
import {
  AppForm,
  AppFormActions,
  AppFormField,
} from "../../../../../design-system/AppForm";
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
    <AppForm
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <AppFormField label={language === "es" ? "Clave" : "Key"}>
        <input
          className="form-control"
          value={value.setting_key}
          onChange={(event) => onChange({ ...value, setting_key: event.target.value })}
        />
      </AppFormField>
      <AppFormField label={language === "es" ? "Valor" : "Value"} fullWidth>
        <textarea
          className="form-control"
          rows={4}
          value={value.setting_value}
          onChange={(event) => onChange({ ...value, setting_value: event.target.value })}
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
