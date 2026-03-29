import type { Language } from "../../../../../store/language-context";
import type { FinanceIconName } from "../components/common/FinanceIcon";

export type FinanceCategoryIconName = Extract<
  FinanceIconName,
  | "categories"
  | "income"
  | "expense"
  | "balance"
  | "salary"
  | "cash"
  | "bills"
  | "food"
  | "home"
  | "health"
  | "shopping"
  | "travel"
  | "leisure"
  | "education"
  | "childcare"
  | "pet"
  | "insurance"
  | "car"
  | "gift"
  | "personal-care"
>;

type FinanceCategoryIconOption = {
  value: FinanceCategoryIconName;
  label: Record<Language, string>;
  categoryTypes: string[];
};

const ALL_CATEGORY_TYPES = ["income", "expense", "transfer"];

export const FINANCE_CATEGORY_ICON_OPTIONS: FinanceCategoryIconOption[] = [
  {
    value: "categories",
    label: { es: "General", en: "General" },
    categoryTypes: ALL_CATEGORY_TYPES,
  },
  {
    value: "income",
    label: { es: "Ingreso genérico", en: "Generic income" },
    categoryTypes: ["income"],
  },
  {
    value: "salary",
    label: { es: "Salario", en: "Salary" },
    categoryTypes: ["income"],
  },
  {
    value: "cash",
    label: { es: "Cobro / efectivo", en: "Cash / collection" },
    categoryTypes: ["income", "transfer"],
  },
  {
    value: "expense",
    label: { es: "Egreso genérico", en: "Generic expense" },
    categoryTypes: ["expense"],
  },
  {
    value: "bills",
    label: { es: "Cuentas / servicios", en: "Bills / utilities" },
    categoryTypes: ["expense"],
  },
  {
    value: "food",
    label: { es: "Comida", en: "Food" },
    categoryTypes: ["expense"],
  },
  {
    value: "home",
    label: { es: "Hogar", en: "Home" },
    categoryTypes: ["expense"],
  },
  {
    value: "health",
    label: { es: "Salud", en: "Health" },
    categoryTypes: ["expense"],
  },
  {
    value: "shopping",
    label: { es: "Compras", en: "Shopping" },
    categoryTypes: ["expense"],
  },
  {
    value: "travel",
    label: { es: "Viaje", en: "Travel" },
    categoryTypes: ["expense"],
  },
  {
    value: "leisure",
    label: { es: "Ocio", en: "Leisure" },
    categoryTypes: ["expense"],
  },
  {
    value: "education",
    label: { es: "Educación", en: "Education" },
    categoryTypes: ["expense"],
  },
  {
    value: "childcare",
    label: { es: "Cuidado infantil", en: "Childcare" },
    categoryTypes: ["expense"],
  },
  {
    value: "pet",
    label: { es: "Mascotas", en: "Pets" },
    categoryTypes: ["expense"],
  },
  {
    value: "insurance",
    label: { es: "Seguro", en: "Insurance" },
    categoryTypes: ["expense"],
  },
  {
    value: "car",
    label: { es: "Automóvil", en: "Car" },
    categoryTypes: ["expense"],
  },
  {
    value: "gift",
    label: { es: "Regalos", en: "Gifts" },
    categoryTypes: ["expense"],
  },
  {
    value: "personal-care",
    label: { es: "Cuidado personal", en: "Personal care" },
    categoryTypes: ["expense"],
  },
  {
    value: "balance",
    label: { es: "Transferencia / ajuste", en: "Transfer / adjustment" },
    categoryTypes: ["transfer"],
  },
];

const FINANCE_CATEGORY_ICON_OPTION_MAP = new Map(
  FINANCE_CATEGORY_ICON_OPTIONS.map((option) => [option.value, option])
);

export function listFinanceCategoryIconOptions(categoryType?: string) {
  if (!categoryType) {
    return FINANCE_CATEGORY_ICON_OPTIONS;
  }
  return FINANCE_CATEGORY_ICON_OPTIONS.filter((option) =>
    option.categoryTypes.includes(categoryType)
  );
}

export function isFinanceCategoryIconName(
  value: string | null | undefined
): value is FinanceCategoryIconName {
  if (!value) {
    return false;
  }
  return FINANCE_CATEGORY_ICON_OPTION_MAP.has(value as FinanceCategoryIconName);
}

export function getFinanceCategoryIconName(
  value: string | null | undefined
): FinanceCategoryIconName {
  return isFinanceCategoryIconName(value) ? value : "categories";
}

export function getFinanceCategoryIconLabel(
  value: string | null | undefined,
  language: Language
): string {
  if (!value) {
    return language === "es" ? "Sin icono" : "No icon";
  }
  const option = FINANCE_CATEGORY_ICON_OPTION_MAP.get(
    value as FinanceCategoryIconName
  );
  if (option) {
    return option.label[language];
  }
  return value;
}
