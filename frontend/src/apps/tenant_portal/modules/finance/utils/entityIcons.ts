import type { Language } from "../../../../../store/language-context";
import type { FinanceIconName } from "../components/common/FinanceIcon";

export type FinanceEntityIconName = Extract<
  FinanceIconName,
  | "users"
  | "finance"
  | "cash"
  | "home"
  | "health"
  | "education"
  | "travel"
  | "gift"
  | "shopping"
  | "food"
  | "car"
  | "pet"
  | "personal-care"
  | "categories"
>;

type FinanceEntityIconOption = {
  value: FinanceEntityIconName;
  label: Record<Language, string>;
};

export const FINANCE_ENTITY_ICON_OPTIONS: FinanceEntityIconOption[] = [
  { value: "users", label: { es: "Persona / tercero", en: "Person / third party" } },
  { value: "finance", label: { es: "Finanzas", en: "Finance" } },
  { value: "cash", label: { es: "Efectivo", en: "Cash" } },
  { value: "home", label: { es: "Hogar", en: "Home" } },
  { value: "health", label: { es: "Salud", en: "Health" } },
  { value: "education", label: { es: "Educación", en: "Education" } },
  { value: "travel", label: { es: "Viaje", en: "Travel" } },
  { value: "gift", label: { es: "Regalo", en: "Gift" } },
  { value: "shopping", label: { es: "Compras", en: "Shopping" } },
  { value: "food", label: { es: "Comida", en: "Food" } },
  { value: "car", label: { es: "Automóvil", en: "Car" } },
  { value: "pet", label: { es: "Mascota", en: "Pet" } },
  { value: "personal-care", label: { es: "Cuidado personal", en: "Personal care" } },
  { value: "categories", label: { es: "General", en: "General" } },
];

const FINANCE_ENTITY_ICON_OPTION_MAP = new Map(
  FINANCE_ENTITY_ICON_OPTIONS.map((option) => [option.value, option])
);

export function isFinanceEntityIconName(
  value: string | null | undefined
): value is FinanceEntityIconName {
  if (!value) {
    return false;
  }
  return FINANCE_ENTITY_ICON_OPTION_MAP.has(value as FinanceEntityIconName);
}

export function getFinanceEntityIconName(
  value: string | null | undefined
): FinanceEntityIconName {
  return isFinanceEntityIconName(value) ? value : "users";
}

export function getFinanceEntityIconLabel(
  value: string | null | undefined,
  language: Language
): string {
  if (!value) {
    return language === "es" ? "Sin icono" : "No icon";
  }
  const option = FINANCE_ENTITY_ICON_OPTION_MAP.get(
    value as FinanceEntityIconName
  );
  if (option) {
    return option.label[language];
  }
  return value;
}
