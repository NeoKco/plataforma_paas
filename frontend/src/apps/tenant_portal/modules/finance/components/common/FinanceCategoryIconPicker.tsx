import { useLanguage } from "../../../../../../store/language-context";
import { FinanceIcon } from "./FinanceIcon";
import {
  getFinanceCategoryIconLabel,
  getFinanceCategoryIconName,
  isFinanceCategoryIconName,
  listFinanceCategoryIconOptions,
} from "../../utils/categoryIcons";

type FinanceCategoryIconPickerProps = {
  categoryType: string;
  value: string | null;
  onChange: (value: string | null) => void;
};

export function FinanceCategoryIconPicker({
  categoryType,
  value,
  onChange,
}: FinanceCategoryIconPickerProps) {
  const { language } = useLanguage();
  const options = listFinanceCategoryIconOptions(categoryType);
  const hasKnownValue = isFinanceCategoryIconName(value);

  return (
    <div className="finance-icon-picker">
      <div className="finance-icon-picker__preview">
        <span className="finance-icon-picker__preview-icon">
          <FinanceIcon name={getFinanceCategoryIconName(value)} size={18} />
        </span>
        <div>
          <div className="finance-icon-picker__preview-title">
            {getFinanceCategoryIconLabel(value, language)}
          </div>
          <div className="finance-icon-picker__preview-note">
            {language === "es"
              ? "Elige un icono semántico para distinguir la categoría en tablas y vistas."
              : "Choose a semantic icon to distinguish this category in tables and views."}
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
            <FinanceIcon name="categories" size={16} />
          </span>
          <span className="finance-icon-picker__option-label">
            {language === "es" ? "Sin icono" : "No icon"}
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
              {getFinanceCategoryIconLabel(option.value, language)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
