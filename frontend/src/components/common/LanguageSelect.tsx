import { useLanguage } from "../../store/language-context";

export function LanguageSelect() {
  const { language, setLanguage } = useLanguage();

  return (
    <label className="language-select">
      <span className="language-select__label">
        {language === "es" ? "Idioma" : "Language"}
      </span>
      <select
        className="form-select form-select-sm language-select__control"
        value={language}
        onChange={(event) => setLanguage(event.target.value as "es" | "en")}
      >
        <option value="es">Español</option>
        <option value="en">English</option>
      </select>
    </label>
  );
}
