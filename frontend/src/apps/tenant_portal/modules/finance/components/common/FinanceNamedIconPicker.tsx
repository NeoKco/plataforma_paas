import { useLanguage } from "../../../../../../store/language-context";
import { FinanceIcon, type FinanceIconName } from "./FinanceIcon";

type FinanceNamedIconPickerOption = {
  value: FinanceIconName;
  label: Record<"es" | "en", string>;
};

type FinanceNamedIconPickerProps = {
  options: FinanceNamedIconPickerOption[];
  value: string | null;
  onChange: (value: string | null) => void;
  fallbackIcon: FinanceIconName;
  helperText: { es: string; en: string };
  emptyLabel?: { es: string; en: string };
  getDisplayLabel: (value: string | null, language: "es" | "en") => string;
  isKnownValue: (value: string | null) => boolean;
};

export function FinanceNamedIconPicker({
  options,
  value,
  onChange,
  fallbackIcon,
  helperText,
  emptyLabel = { es: "Sin icono", en: "No icon" },
  getDisplayLabel,
  isKnownValue,
}: FinanceNamedIconPickerProps) {
  const { language } = useLanguage();
  const hasKnownValue = isKnownValue(value);

  return (
    <div className="finance-icon-picker">
      <div className="finance-icon-picker__preview">
        <span className="finance-icon-picker__preview-icon">
          <FinanceIcon
            name={hasKnownValue ? (value as FinanceIconName) : fallbackIcon}
            size={18}
          />
        </span>
        <div>
          <div className="finance-icon-picker__preview-title">
            {getDisplayLabel(value, language)}
          </div>
          <div className="finance-icon-picker__preview-note">
            {helperText[language]}
          </div>
        </div>
      </div>

      {value && !hasKnownValue ? (
        <div className="finance-icon-picker__legacy-note">
          {language === "es"
            ? `Este registro conserva un icono legado no mapeado todavía: ${value}`
            : `This record keeps a legacy icon value not mapped yet: ${value}`}
        </div>
      ) : null}

      <div className="finance-icon-picker__grid">
        <button
          className={`finance-icon-picker__option${!value ? " is-selected" : ""}`}
          type="button"
          onClick={() => onChange(null)}
        >
          <span className="finance-icon-picker__option-icon is-empty">
            <FinanceIcon name={fallbackIcon} size={16} />
          </span>
          <span className="finance-icon-picker__option-label">
            {emptyLabel[language]}
          </span>
        </button>
        {options.map((option) => (
          <button
            key={option.value}
            className={`finance-icon-picker__option${
              value === option.value ? " is-selected" : ""
            }`}
            type="button"
            onClick={() => onChange(option.value)}
          >
            <span className="finance-icon-picker__option-icon">
              <FinanceIcon name={option.value} size={16} />
            </span>
            <span className="finance-icon-picker__option-label">
              {option.label[language]}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
